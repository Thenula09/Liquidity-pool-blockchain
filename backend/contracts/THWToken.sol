// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract THWToken is ERC20 {
    constructor() ERC20("THW Token", "THW") {
        // මුලින්ම ටෝකන් මිලියනයක් (1,000,000) හදලා ඔයාගේ wallet එකට දෙනවා
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }
}
