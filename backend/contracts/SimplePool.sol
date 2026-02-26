// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract SimplePool {
    IERC20 public token;
    address public owner;

    uint256 public totalEthInPool;
    uint256 public totalTokensInPool;

    constructor(address _tokenAddress) {
        token = IERC20(_tokenAddress);
        owner = msg.sender;
    }

    // Liquidity එකතු කිරීම (ETH + THW)
    function addLiquidity(uint256 _tokenAmount) public payable {
        require(msg.value > 0, "ETH required");
        require(_tokenAmount > 0, "Tokens required");

        // Owner ගෙන් ටෝකන් ටික Contract එකට ගන්නවා
        token.transferFrom(msg.sender, address(this), _tokenAmount);

        totalEthInPool += msg.value;
        totalTokensInPool += _tokenAmount;
    }

    // Liquidity ඉවත් කිරීම (Owner ට විතරයි පුළුවන්)
    function removeLiquidity() public {
        require(msg.sender == owner, "Only owner can remove");
        
        uint256 ethToReturn = address(this).balance;
        uint256 tokensToReturn = token.balanceOf(address(this));

        payable(owner).transfer(ethToReturn);
        token.transfer(owner, tokensToReturn);

        totalEthInPool = 0;
        totalTokensInPool = 0;
    }

    // ETH යවලා THW ගන්න (Buy)
    function swapETHForTHW() public payable {
        require(msg.value > 0, "ETH required");
        require(totalTokensInPool > 0, "No tokens in pool");

        // Calculate THW amount to receive (with 0.3% fee)
        uint256 ethAmount = msg.value;
        uint256 fee = (ethAmount * 3) / 1000; // 0.3% fee
        uint256 ethForSwap = ethAmount - fee;
        
        uint256 thwAmount = (ethForSwap * totalTokensInPool) / totalEthInPool;
        
        require(thwAmount > 0, "Insufficient liquidity");
        require(thwAmount <= token.balanceOf(address(this)), "Not enough tokens");

        // Update pool reserves
        totalEthInPool += ethForSwap;
        totalTokensInPool -= thwAmount;

        // Transfer THW to user
        token.transfer(msg.sender, thwAmount);
    }

    // THW යවලා ETH ගන්න (Sell)
    function swapTHWForETH(uint256 _tokenAmount) public {
        require(_tokenAmount > 0, "Tokens required");
        require(totalTokensInPool > 0, "No tokens in pool");

        // Calculate ETH amount to receive (with 0.3% fee)
        uint256 ethAmount = (_tokenAmount * totalEthInPool) / totalTokensInPool;
        uint256 fee = (ethAmount * 3) / 1000; // 0.3% fee
        uint256 ethForUser = ethAmount - fee;
        
        require(ethForUser > 0, "Insufficient liquidity");
        require(ethForUser <= address(this).balance, "Not enough ETH");

        // Transfer THW from user to pool
        token.transferFrom(msg.sender, address(this), _tokenAmount);

        // Update pool reserves
        totalTokensInPool += _tokenAmount;
        totalEthInPool -= ethForUser;

        // Transfer ETH to user
        payable(msg.sender).transfer(ethForUser);
    }

    // වර්තමාන මිල ලබා ගැනීම (ETH/THW)
    function getPrice() public view returns (uint256) {
        if (totalTokensInPool == 0) return 0;
        return (totalEthInPool * 1e18) / totalTokensInPool;
    }
}
