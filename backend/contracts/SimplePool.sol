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

    // වර්තමාන මිල ලබා ගැනීම (ETH/THW)
    function getPrice() public view returns (uint256) {
        if (totalTokensInPool == 0) return 0;
        return (totalEthInPool * 1e18) / totalTokensInPool;
    }
}
