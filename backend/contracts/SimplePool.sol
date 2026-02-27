// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract SimplePool {
    IERC20 public token;
    address public owner;

    uint256 public ethReserve;
    uint256 public tokenReserve;
    
    // CPMM constant k = x * y
    uint256 public constant K = 1000000 * 1e18; // Initial k value

    event Swap(address indexed user, uint256 ethAmount, uint256 tokenAmount, uint256 timestamp);
    event LiquidityAdded(address indexed provider, uint256 ethAmount, uint256 tokenAmount);

    constructor(address _tokenAddress) {
        console.log("SimplePool Constructor: Deploying with token address: %s", _tokenAddress);
        token = IERC20(_tokenAddress);
        owner = msg.sender;
        console.log("SimplePool deployed successfully. Owner: %s", owner);
    }

    // Add liquidity (ETH + THW)
    function addLiquidity(uint256 _tokenAmount) public payable {
        console.log("=== INSIDE CONTRACT ADDLIQUIDITY ===");
        console.log("Adding Liquidity - From: %s, ETH: %s, THW: %s", msg.sender, msg.value, _tokenAmount);
        require(msg.value > 0, "ETH required");
        require(_tokenAmount > 0, "Tokens required");

        // Transfer tokens from owner to contract
        console.log("Transferring %s THW tokens from user to pool", _tokenAmount);
        token.transferFrom(msg.sender, address(this), _tokenAmount);

        ethReserve += msg.value;
        tokenReserve += _tokenAmount;
        
        console.log("New Reserves - ETH: %s, THW: %s", ethReserve, tokenReserve);
        emit LiquidityAdded(msg.sender, msg.value, _tokenAmount);
        console.log("Liquidity Added Successfully!");
        console.log("=== END CONTRACT ADDLIQUIDITY ===");
    }

    // Remove liquidity (Owner only)
    function removeLiquidity() public {
        require(msg.sender == owner, "Only owner can remove");
        
        uint256 ethToReturn = address(this).balance;
        uint256 tokensToReturn = token.balanceOf(address(this));

        payable(owner).transfer(ethToReturn);
        token.transfer(owner, tokensToReturn);

        ethReserve = 0;
        tokenReserve = 0;
    }

    // CPMM Buy Function (ETH -> THW)
    function buyTokens() public payable {
        uint256 ethInput = msg.value;
        console.log("Buying THW Tokens - User: %s, ETH Input: %s", msg.sender, ethInput);
        require(ethInput > 0, "ETH required");
        require(tokenReserve > 0, "No tokens in pool");

        console.log("Current Reserves - ETH: %s, THW: %s", ethReserve, tokenReserve);
        
        // CPMM Formula: tokensToReceive = (tokenReserve * ethInput) / (ethReserve + ethInput)
        uint256 tokensToReceive = (tokenReserve * ethInput) / (ethReserve + ethInput);
        
        console.log("Calculated THW to receive: %s", tokensToReceive);
        require(tokensToReceive > 0, "Insufficient liquidity");
        require(tokensToReceive <= tokenReserve, "Not enough tokens");

        // Update reserves
        ethReserve += ethInput;
        tokenReserve -= tokensToReceive;
        
        console.log("Updated Reserves - ETH: %s, THW: %s", ethReserve, tokenReserve);

        // Transfer THW to user
        token.transfer(msg.sender, tokensToReceive);

        emit Swap(msg.sender, ethInput, tokensToReceive, block.timestamp);
    }

    // CPMM Sell Function (THW -> ETH)
    function sellTokens(uint256 _tokenAmount) public {
        console.log("Selling THW Tokens - User: %s, THW Amount: %s", msg.sender, _tokenAmount);
        require(_tokenAmount > 0, "Tokens required");
        require(ethReserve > 0, "No ETH in pool");

        console.log("Current Reserves - ETH: %s, THW: %s", ethReserve, tokenReserve);

        // CPMM Formula: ethToReceive = (ethReserve * _tokenAmount) / (tokenReserve + _tokenAmount)
        uint256 ethToReceive = (ethReserve * _tokenAmount) / (tokenReserve + _tokenAmount);
        
        console.log("Calculated ETH to receive: %s", ethToReceive);
        require(ethToReceive > 0, "Insufficient liquidity");
        require(ethToReceive <= ethReserve, "Not enough ETH");

        // Transfer THW from user to pool
        console.log("Transferring %s THW tokens from user to pool", _tokenAmount);
        token.transferFrom(msg.sender, address(this), _tokenAmount);

        // Update reserves
        tokenReserve += _tokenAmount;
        ethReserve -= ethToReceive;
        
        console.log("Updated Reserves - ETH: %s, THW: %s", ethReserve, tokenReserve);

        // Transfer ETH to user
        console.log("Transferring %s ETH to user", ethToReceive);
        payable(msg.sender).transfer(ethToReceive);

        emit Swap(msg.sender, ethToReceive, _tokenAmount, block.timestamp);
        console.log("Sell Transaction Completed Successfully!");
    }

    // Get current price (ETH/THW)
    function getPrice() public view returns (uint256) {
        if (tokenReserve == 0) return 0;
        uint256 price = (ethReserve * 1e18) / tokenReserve;
        console.log("GetPrice Called - Current Price: %s (1 THW = %s ETH)", price, price / 1e18);
        return price;
    }

    // Get current reserves for frontend
    function getReserves() public view returns (uint256, uint256) {
        return (ethReserve, tokenReserve);
    }
}
