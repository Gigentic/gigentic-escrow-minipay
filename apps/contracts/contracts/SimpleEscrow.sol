// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract SimpleEscrow {
    address public depositor;
    address public recipient;
    uint256 public amount;
    bool public isDeposited;
    bool public isReleased;

    constructor(address _recipient) payable {
        depositor = msg.sender;
        recipient = _recipient;
        amount = msg.value;
        require(amount > 0, "Must deposit CELO");
        isDeposited = true;
        isReleased = false;
    }

    // Only depositor can release
    function release() external {
        require(msg.sender == depositor, "Only depositor");
        require(isDeposited && !isReleased, "Not ready to release");
        isReleased = true;
        (bool sent, ) = recipient.call{value: amount}("");
        require(sent, "Transfer failed");
    }

    // Helper: return state
    function escrowInfo() external view returns (
        address, address, uint256, bool, bool
    ) {
        return (depositor, recipient, amount, isDeposited, isReleased);
    }
}
