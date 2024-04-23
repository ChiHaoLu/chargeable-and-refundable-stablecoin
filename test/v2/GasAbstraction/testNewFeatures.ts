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
  accounts,
  accountPrivateKeys,
} from "../../helpers/constants";
import { hexStringFromBuffer } from "../../helpers";
import {
  signTransferAuthorization,
  TestParams,
  WalletType,
  prepareSignature,
} from "./helpers";

import { FiatTokenV2_2InstanceExtended } from "../../../@types/AnyFiatTokenV2Instance";

export function testNewFeatures({
  getFiatToken,
  getERC1271Wallet,
  getDomainSeparator,
  signerWalletType,
  signatureBytesType,
}: TestParams): void {
  describe(`transferWithAuthorization with ${signerWalletType} wallet, ${signatureBytesType} signature interface`, async () => {
    const valueUsage = 6; // valueForService == valueForFeeRefund == burnValue
    const nonceUsage: string = hexStringFromBuffer(crypto.randomBytes(32));

    const [alice, bob, vault] = ACCOUNTS_AND_KEYS;

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
    let minter: {
      address: string;
      key: string;
    };
    let burner: {
      address: string;
      key: string;
    };
    let fiatToken: FiatTokenV2_2InstanceExtended;
    let aliceWallet: MockERC1271WalletInstance;
    let domainSeparator: string;

    before(async () => {
      fiatTokenOwner = await getFiatToken().owner();
    });

    beforeEach(async () => {
      fiatToken = getFiatToken() as FiatTokenV2_2InstanceExtended;
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

      // masterMinter is burner too
      minter = {
        address: accounts.mintOwnerAccount,
        key: accountPrivateKeys.mintOwnerAccount,
      };
      burner = minter;
      expect(await fiatToken.masterMinter()).to.equal(minter.address);
      expect(await fiatToken.masterMinter()).to.equal(burner.address);

      // Set vault
      await fiatToken.setVault(vault.address, {
        from: fiatTokenOwner,
      });
      expect(await fiatToken.vault()).to.equal(vault.address);
      await fiatToken.mint(vault.address, initialBalance, {
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
        {
          from: charlie,
        }
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

    it("transferWithAuthorizationAndCharge", async () => {
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
      console.log(nonce);

      const signatureForCharge = signTransferAuthorization(
        from,
        vault.address,
        valueUsage,
        validAfter,
        validBefore,
        nonceUsage,
        domainSeparator,
        alice.key
      );

      // check initial balance
      expect((await fiatToken.balanceOf(from)).toNumber()).to.equal(10e6);
      expect((await fiatToken.balanceOf(to)).toNumber()).to.equal(0);

      // check that the authorization state is false
      expect(await fiatToken.authorizationState(from, nonce)).to.equal(false);

      // a third-party, Charlie (not Alice) submits the signed authorization
      await fiatToken.transferWithAuthorizationAndCharge(
        from,
        to,
        value,
        validAfter,
        validBefore,
        nonce,
        ...prepareSignature(signature, signatureBytesType),
        valueUsage,
        nonceUsage,
        ...prepareSignature(signatureForCharge, signatureBytesType),
        {
          from: charlie,
        }
      );

      // check that balance is updated
      expect((await fiatToken.balanceOf(from)).toNumber()).to.equal(
        initialBalance - value - valueUsage
      );
      expect((await fiatToken.balanceOf(to)).toNumber()).to.equal(value);
      expect((await fiatToken.balanceOf(vault.address)).toNumber()).to.equal(
        initialBalance + valueUsage
      );
    });

    it("transferWithAuthorizationAndFeeRefund", async () => {
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
      console.log(nonce);

      const signatureForFeeRefund = signTransferAuthorization(
        vault.address,
        to,
        valueUsage,
        validAfter,
        validBefore,
        nonceUsage,
        domainSeparator,
        vault.key
      );

      // check initial balance
      expect((await fiatToken.balanceOf(from)).toNumber()).to.equal(10e6);
      expect((await fiatToken.balanceOf(to)).toNumber()).to.equal(0);

      // check that the authorization state is false
      expect(await fiatToken.authorizationState(from, nonce)).to.equal(false);

      // a third-party, Charlie (not Alice) submits the signed authorization
      await fiatToken.transferWithAuthorizationAndFeeRefund(
        from,
        to,
        value,
        validAfter,
        validBefore,
        nonce,
        ...prepareSignature(signature, signatureBytesType),
        valueUsage,
        nonceUsage,
        ...prepareSignature(signatureForFeeRefund, signatureBytesType),
        {
          from: charlie,
        }
      );

      // check that balance is updated
      expect((await fiatToken.balanceOf(from)).toNumber()).to.equal(
        initialBalance - value
      );
      expect((await fiatToken.balanceOf(to)).toNumber()).to.equal(
        value + valueUsage
      );
      expect((await fiatToken.balanceOf(vault.address)).toNumber()).to.equal(
        initialBalance - valueUsage
      );
    });
    it("burnByService", async () => {
      const { from, to, validAfter, validBefore } = transferParams;

      const signatureForTransferToBurner = signTransferAuthorization(
        from,
        burner.address,
        valueUsage,
        validAfter,
        validBefore,
        nonceUsage,
        domainSeparator,
        alice.key
      );

      // check initial balance
      expect((await fiatToken.balanceOf(from)).toNumber()).to.equal(10e6);
      expect((await fiatToken.balanceOf(to)).toNumber()).to.equal(0);

      // check that the authorization state is false
      expect(await fiatToken.authorizationState(from, nonce)).to.equal(false);

      // a third-party, Charlie (not Alice) submits the signed authorization
      await fiatToken.burnByService(
        from,
        valueUsage,
        validAfter,
        validBefore,
        nonceUsage,
        ...prepareSignature(signatureForTransferToBurner, signatureBytesType),
        {
          from: charlie,
        }
      );

      // check that balance is updated
      expect((await fiatToken.balanceOf(from)).toNumber()).to.equal(
        initialBalance - valueUsage
      );
      expect((await fiatToken.balanceOf(burner.address)).toNumber()).to.equal(
        valueUsage
      );
    });
  });
}
