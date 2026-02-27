// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract THWToken is ERC20 {
    constructor() ERC20("THW Token", "THW") {
        console.log("THW Token Constructor: Deploying THW Token...");
        // මුලින්ම ටෝකන් මිලියනයක් (1,000,000) හදලා ඔයාගේ wallet එකට දෙනවා
        uint256 initialSupply = 1000000 * 10 ** decimals();
        _mint(msg.sender, initialSupply);
        console.log("THW Token deployed successfully!");
        console.log("Initial Supply: %s THW", initialSupply / 10 ** decimals());
        console.log("Minted to: %s", msg.sender);
    }
    
    function transfer(address to, uint256 amount) public override returns (bool) {
        console.log("THW Transfer - From: %s, To: %s, Amount: %s", msg.sender, to, amount);
        bool result = super.transfer(to, amount);
        console.log("THW Transfer Completed - Success: %s", result);
        return result;
    }
    
    function approve(address spender, uint256 amount) public override returns (bool) {
        console.log("THW Approval - Owner: %s, Spender: %s, Amount: %s", msg.sender, spender, amount);
        bool result = super.approve(spender, amount);
        console.log("THW Approval Completed - Success: %s", result);
        return result;
    }
}
