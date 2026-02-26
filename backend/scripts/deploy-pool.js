import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("Deploying THW Token and SimplePool contracts...");

  // Provider and Signer
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  const signer = new ethers.Wallet(privateKey, provider);

  // Reset nonce by getting current nonce
  console.log("Resetting nonce...");
  const currentNonce = await provider.getTransactionCount(signer.address);
  console.log("Current nonce:", currentNonce);

  // 1. Deploy THW Token first
  console.log("Deploying THW Token...");
  const tokenPath = path.join(__dirname, "../artifacts/contracts/THWToken.sol/THWToken.json");
  const tokenArtifact = JSON.parse(fs.readFileSync(tokenPath, "utf8"));
  const tokenAbi = tokenArtifact.abi;
  const tokenBytecode = tokenArtifact.bytecode;

  const tokenFactory = new ethers.ContractFactory(tokenAbi, tokenBytecode, signer);
  const token = await tokenFactory.deploy();
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();

  console.log("THW Token deployed to:", tokenAddress);

  // 2. Deploy SimplePool with token address
  console.log("Deploying SimplePool...");
  const poolPath = path.join(__dirname, "../artifacts/contracts/SimplePool.sol/SimplePool.json");
  const poolArtifact = JSON.parse(fs.readFileSync(poolPath, "utf8"));
  const poolAbi = poolArtifact.abi;
  const poolBytecode = poolArtifact.bytecode;

  const poolFactory = new ethers.ContractFactory(poolAbi, poolBytecode, signer);
  const pool = await poolFactory.deploy(tokenAddress);
  await pool.waitForDeployment();
  const poolAddress = await pool.getAddress();

  console.log("SimplePool deployed to:", poolAddress);
  
  // Save contract info for frontend
  const contractInfo = {
    poolAddress: poolAddress,
    tokenAddress: tokenAddress,
    network: "localhost",
    chainId: 31337
  };
  
  // Save to a file for frontend to use
  fs.writeFileSync(
    path.join(__dirname, "../contract-info.json"),
    JSON.stringify(contractInfo, null, 2)
  );
  
  console.log("Contract Info saved to contract-info.json:", contractInfo);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
