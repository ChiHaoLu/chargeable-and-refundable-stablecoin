import crypto from "crypto";
import { MockERC1271WalletInstance } from "../../../@types/generated";
import {
  AuthorizationUsed,
  Transfer,
} from "../../../@types/generated/FiatTokenV2";
import {
  ACCOUNTS_AND_KEYS,
  HARDHAT_ACCOUNTS,
  MAX_UINT256_HEX,
} from "../../helpers/constants";
import { hexStringFromBuffer } from "../../helpers";
import {
  signTransferAuthorization,
  TestParams,
  WalletType,
  prepareSignature,
} from "./helpers";
import { AnyFiatTokenV2Instance } from "../../../@types/AnyFiatTokenV2Instance";

export function testNewFeatures({
  getFiatToken,
  getERC1271Wallet,
  getDomainSeparator,
  signerWalletType,
  signatureBytesType,
}: TestParams): void {
  describe(`transferWithAuthorization with ${signerWalletType} wallet, ${signatureBytesType} signature interface`, async () => {
    const [alice, bob] = ACCOUNTS_AND_KEYS;
    const charlie = HARDHAT_ACCOUNTS[1];
    const nonce: string = hexStringFromBuffer(crypto.randomBytes(32));
    const initialBalance = 10e6;
    const transferParams = {
      from: "",
      to: bob.address,
      value: 7e6,
      validAfter: 0,
      validBefore: MAX_UINT256_HEX,
      nonce,
    };

    let fiatTokenOwner: string;
    let fiatToken: AnyFiatTokenV2Instance;
    let aliceWallet: MockERC1271WalletInstance;
    let domainSeparator: string;

    before(async () => {
      fiatTokenOwner = await getFiatToken().owner();
    });

    beforeEach(async () => {
      fiatToken = getFiatToken();
      aliceWallet = await getERC1271Wallet(alice.address);
      domainSeparator = getDomainSeparator();

      // Initialize `from` address either as Alice's EOA address or Alice's wallet address
      if (signerWalletType == WalletType.AA) {
        transferParams.from = aliceWallet.address;
      } else {
        transferParams.from = alice.address;
      }

      await fiatToken.configureMinter(fiatTokenOwner, 1000000e6, {
        from: fiatTokenOwner,
      });
      await fiatToken.mint(transferParams.from, initialBalance, {
        from: fiatTokenOwner,
      });
    });

    it("executes a transfer when a valid authorization is given", async () => {
      const { from, to, value, validAfter, validBefore } = transferParams;
      // create an authorization to transfer money from Alice to Bob and sign
      // with Alice's key
      const signature = signTransferAuthorization(
        from,
        to,
        value,
        validAfter,
        validBefore,
        nonce,
        domainSeparator,
        alice.key
      );

      // check initial balance
      expect((await fiatToken.balanceOf(from)).toNumber()).to.equal(10e6);
      expect((await fiatToken.balanceOf(to)).toNumber()).to.equal(0);

      // check that the authorization state is false
      expect(await fiatToken.authorizationState(from, nonce)).to.equal(false);

      // a third-party, Charlie (not Alice) submits the signed authorization
      const result = await fiatToken.transferWithAuthorization(
        from,
        to,
        value,
        validAfter,
        validBefore,
        nonce,
        ...prepareSignature(signature, signatureBytesType),
        { from: charlie }
      );

      // check that balance is updated
      expect((await fiatToken.balanceOf(from)).toNumber()).to.equal(
        initialBalance - value
      );
      expect((await fiatToken.balanceOf(to)).toNumber()).to.equal(value);

      // check that AuthorizationUsed event is emitted
      const log0 = result.logs[0] as Truffle.TransactionLog<AuthorizationUsed>;
      expect(log0.event).to.equal("AuthorizationUsed");
      expect(log0.args[0]).to.equal(from);
      expect(log0.args[1]).to.equal(nonce);

      // check that Transfer event is emitted
      const log1 = result.logs[1] as Truffle.TransactionLog<Transfer>;
      expect(log1.event).to.equal("Transfer");
      expect(log1.args[0]).to.equal(from);
      expect(log1.args[1]).to.equal(to);
      expect(log1.args[2].toNumber()).to.equal(value);

      // check that the authorization state is now true
      expect(await fiatToken.authorizationState(from, nonce)).to.equal(true);
    });

    // it("transferWithAuthorizationAndCharge", async () => {});
    // it("transferWithAuthorizationAndFeeRefund", async () => {});
    // it("burnByService", async () => {});
  });
}
