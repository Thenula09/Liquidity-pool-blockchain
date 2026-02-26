import hre from "hardhat";

console.log("HRE object keys:", Object.keys(hre));
console.log("HRE ethers:", hre.ethers);
if (hre.ethers) {
  console.log("Ethers keys:", Object.keys(hre.ethers));
}
