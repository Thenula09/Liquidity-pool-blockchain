import { ethers } from "hardhat";

async function main() {
  console.log("Testing contract deployment...");
  
  // Contract addresses from frontend
  const poolAddress = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";
  const tokenAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
  
  try {
    // Get signers
    const [deployer] = await ethers.getSigners();
    console.log("Testing with account:", deployer.address);
    
    // Test pool contract
    console.log("\n=== Testing Pool Contract ===");
    const poolContract = await ethers.getContractAt("SimplePool", poolAddress);
    console.log("Pool contract found at:", poolAddress);
    
    // Test if functions exist
    try {
      const price = await poolContract.getPrice();
      console.log("✅ getPrice() works, price:", price.toString());
    } catch (error) {
      console.log("❌ getPrice() failed:", error.message);
    }
    
    try {
      const reserves = await poolContract.getReserves();
      console.log("✅ getReserves() works, reserves:", reserves);
    } catch (error) {
      console.log("❌ getReserves() failed:", error.message);
    }
    
    try {
      const owner = await poolContract.owner();
      console.log("✅ owner() works, owner:", owner);
    } catch (error) {
      console.log("❌ owner() failed:", error.message);
    }
    
    // Test token contract
    console.log("\n=== Testing Token Contract ===");
    const tokenContract = await ethers.getContractAt("THWToken", tokenAddress);
    console.log("Token contract found at:", tokenAddress);
    
    try {
      const name = await tokenContract.name();
      console.log("✅ name() works, name:", name);
    } catch (error) {
      console.log("❌ name() failed:", error.message);
    }
    
    try {
      const totalSupply = await tokenContract.totalSupply();
      console.log("✅ totalSupply() works, totalSupply:", totalSupply.toString());
    } catch (error) {
      console.log("❌ totalSupply() failed:", error.message);
    }
    
  } catch (error) {
    console.error("❌ Contract test failed:", error.message);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
