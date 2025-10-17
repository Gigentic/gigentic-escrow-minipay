// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockCUSD
 * @dev Mock Celo Dollar token for testing purposes
 */
contract MockCUSD is ERC20 {
    constructor() ERC20("Mock Celo Dollar", "mcUSD") {
        // Mint initial supply to deployer for testing
        _mint(msg.sender, 1000000 * 10**decimals());
    }

    /**
     * @dev Mint tokens to any address (for testing)
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /**
     * @dev Override decimals to match cUSD (18 decimals)
     */
    function decimals() public pure override returns (uint8) {
        return 18;
    }
}

