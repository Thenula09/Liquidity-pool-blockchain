import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  // Get contract artifact
  const contractPath = path.join(__dirname, "../artifacts/contracts/THWToken.sol/THWToken.json");
  const contractArtifact = JSON.parse(fs.readFileSync(contractPath, "utf8"));
  
  // Connect to local network
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  
  // Get the first account (deployer)
  const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  const wallet = new ethers.Wallet(privateKey, provider);
  
  console.log("Deploying contracts with the account:", wallet.address);
  
  // Deploy contract
  const contractFactory = new ethers.ContractFactory(
    contractArtifact.abi,
    contractArtifact.bytecode,
    wallet
  );
  
  const contract = await contractFactory.deploy();
  await contract.waitForDeployment();
  
  const contractAddress = await contract.getAddress();
  console.log("THW Token deployed to:", contractAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
