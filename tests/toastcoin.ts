import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import test from "ava";
import ava, { ExecutionContext } from "ava";
import { Toastcoin } from "../target/types/toastcoin";
import {
  TOKEN_PROGRAM_ID,
  MINT_SIZE,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  createInitializeMintInstruction,
} from "@solana/spl-token";

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);

const program = anchor.workspace.Toastcoin as Program<Toastcoin>;
const mintkey = anchor.web3.Keypair.generate();
let associatedTokenAccount: anchor.web3.PublicKey | undefined = undefined;

async function shouldMintAToken(t: ExecutionContext) {
  // Get anchor's wallet's public key
  const key = anchor.AnchorProvider.env().wallet.publicKey;
  // Get the amount of SOL needed to pay rent for our Token Mint
  const lamports: number =
    await program.provider.connection.getMinimumBalanceForRentExemption(
      MINT_SIZE
    );

  // Get the ATA for a token and the account that we want to own the ATA (but it might not existing on the SOL network yet)
  associatedTokenAccount = await getAssociatedTokenAddress(
    mintkey.publicKey,
    key
  );

  // Fires a list of instructions
  const mint_tx = new anchor.web3.Transaction().add(
    // Use anchor to create an account from the mint key that we created
    anchor.web3.SystemProgram.createAccount({
      // The account that will transfer lamports to the created account
      // The account that is transfering the SOL balance to the other wallet
      // The account is paying for this operation
      fromPubkey: key,

      // Public key of the created account
      newAccountPubkey: mintkey.publicKey,

      // Amount of space in bytes to allocate to the created account
      space: MINT_SIZE,

      // Public key of the program to assign as the owner of the created account
      programId: TOKEN_PROGRAM_ID,

      // Amount of lamports to transfer to the created account
      // How much SOL we are transferring to the new account
      lamports,
    }),
    // Fire a transaction to create our mint account that is controlled by our anchor wallet
    createInitializeMintInstruction(
      // mintKey.publicKey - token mint account
      // 0(decimals) - number
      // key(intAuthority) — Minting authority
      // key(programID) - SPL token program account (signer account)
      mintkey.publicKey,
      0,
      key,
      key
    ),
    // Create the ATA account that is associated with our mint on our anchor wallet
    createAssociatedTokenAccountInstruction(
      key,
      associatedTokenAccount,
      key,
      mintkey.publicKey
    )
  );

  // sends and create the transaction
  // mintKey = signer key
  await anchor.AnchorProvider.env().sendAndConfirm(mint_tx, [mintkey]);

  // console.log(
  //   await program.provider.connection.getParsedAccountInfo(mintkey.publicKey)
  // );

  // console.log("Account: ", res);
  // console.log("Mint key: ", mintkey.publicKey.toString());
  // console.log("User: ", key.toString());

  // Executes our code to mint our token into our specified ATA
  await program.methods
    .mintToken()
    .accounts({
      mint: mintkey.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      to: associatedTokenAccount,
      authority: key,
    })
    .rpc();

  // Get minted token amount on the ATA for our anchor wallet
  const parsedAccount = await program.provider.connection.getParsedAccountInfo(
    associatedTokenAccount
  );

  if (!parsedAccount.value) t.fail();

  const minted = parsedAccount.value as any;

  t.is(minted?.data.parsed.info.tokenAmount.amount, "10");
}

async function shouldTransferToken(t: ExecutionContext) {
  // Get anchor's wallet's public key
  const myWallet = anchor.web3.Keypair.generate();
  // Wallet that will receive the token
  const toWallet = anchor.web3.Keypair.generate();

  // The ATA for a token on the to wallet (but might not exist yet)
  const toATA = await getAssociatedTokenAddress(
    mintkey.publicKey,
    toWallet.publicKey
  );

  // Create the ATA account that is associated with our To wallet
  const mintTransaction = new anchor.web3.Transaction().add(
    createAssociatedTokenAccountInstruction(
      myWallet.publicKey,
      toATA,
      toWallet.publicKey,
      mintkey.publicKey
    )
  );

  await anchor.AnchorProvider.env().sendAndConfirm(mintTransaction, [myWallet]);

  await program.methods
    .transferToken()
    .accounts({
      tokenProgram: TOKEN_PROGRAM_ID,
      from: associatedTokenAccount as any,
      authority: myWallet.publicKey,
      to: toATA,
    })
    .rpc();

  const parsedAccount = await program.provider.connection.getParsedAccountInfo(
    associatedTokenAccount as any
  );

  if (!parsedAccount.value) t.fail();

  const minted = parsedAccount.value as any;

  t.is(minted?.data.parsed.info.tokenAmount.amount, "7");
}

test("Should mint a token", shouldMintAToken);
test.failing("Should transfer token", shouldTransferToken);
