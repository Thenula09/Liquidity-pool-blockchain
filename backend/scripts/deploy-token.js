import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("Deploying THW Token contract...");

  // Provider and Signer
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  const signer = new ethers.Wallet(privateKey, provider);

  // Get THW Token contract ABI and bytecode
  const contractPath = path.join(__dirname, "../artifacts/contracts/THWToken.sol/THWToken.json");
  const contractArtifact = JSON.parse(fs.readFileSync(contractPath, "utf8"));
  const abi = contractArtifact.abi;
  const bytecode = contractArtifact.bytecode;

  // Deploy THW Token
  const factory = new ethers.ContractFactory(abi, bytecode, signer);
  const token = await factory.deploy();

  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();

  console.log("THW Token deployed to:", tokenAddress);
  
  // Save token address for pool deployment
  fs.writeFileSync(
    path.join(__dirname, "../token-address.json"),
    JSON.stringify({ tokenAddress: tokenAddress }, null, 2)
  );
  
  console.log("Token Address saved to token-address.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
