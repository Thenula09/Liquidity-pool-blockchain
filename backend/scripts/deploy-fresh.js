import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("🚀 Deploying fresh contracts...");

  try {
    // Create fresh provider and signer
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
    const signer = new ethers.Wallet(privateKey, provider);

    // Get current nonce
    const nonce = await provider.getTransactionCount(signer.address);
    console.log("📊 Current nonce:", nonce);

    // 1. Deploy THW Token
    console.log("🪙 Deploying THW Token...");
    const tokenPath = path.join(__dirname, "../artifacts/contracts/THWToken.sol/THWToken.json");
    const tokenArtifact = JSON.parse(fs.readFileSync(tokenPath, "utf8"));
    
    const tokenFactory = new ethers.ContractFactory(
      tokenArtifact.abi, 
      tokenArtifact.bytecode, 
      signer
    );
    
    const token = await tokenFactory.deploy({ nonce: nonce });
    await token.waitForDeployment();
    const tokenAddress = await token.getAddress();
    console.log("✅ THW Token deployed to:", tokenAddress);

    // 2. Deploy SimplePool
    console.log("💧 Deploying SimplePool...");
    const poolPath = path.join(__dirname, "../artifacts/contracts/SimplePool.sol/SimplePool.json");
    const poolArtifact = JSON.parse(fs.readFileSync(poolPath, "utf8"));
    
    const poolFactory = new ethers.ContractFactory(
      poolArtifact.abi, 
      poolArtifact.bytecode, 
      signer
    );
    
    const pool = await poolFactory.deploy(tokenAddress, { nonce: nonce + 1 });
    await pool.waitForDeployment();
    const poolAddress = await pool.getAddress();
    console.log("✅ SimplePool deployed to:", poolAddress);

    // 3. Save contract info
    const contractInfo = {
      poolAddress: poolAddress,
      tokenAddress: tokenAddress,
      network: "localhost",
      chainId: 31337
    };
    
    fs.writeFileSync(
      path.join(__dirname, "../contract-info.json"),
      JSON.stringify(contractInfo, null, 2)
    );
    
    console.log("📁 Contract Info saved:", contractInfo);
    console.log("🎉 Deployment successful!");

  } catch (error) {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }
}

main();
