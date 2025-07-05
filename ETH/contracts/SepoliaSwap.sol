// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IWormholeBridge {
    function publishMessage(
        uint32 nonce,
        bytes memory payload,
        uint8 consistencyLevel
    ) external payable returns (uint64);
}

contract SepoliaSwap {
    address public owner;
    address public wormholeBridge;
    uint256 public wormholeFee;
    
    event SwapInitiated(address indexed user, uint256 amount, string aptosAddress, uint64 sequence);
    event SwapReversed(string aptosSender, address indexed ethReceiver, uint256 amount);
    event WormholeFeeUpdated(uint256 newFee);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    constructor(address _bridge, uint256 _wormholeFee) {
        require(_bridge != address(0), "Bridge address cannot be zero");
        owner = msg.sender;
        wormholeBridge = _bridge;
        wormholeFee = _wormholeFee;
    }

    function swapToAptos(string memory aptosAddress) public payable {
        require(msg.value > wormholeFee, "Insufficient ETH sent");
        require(bytes(aptosAddress).length > 0, "Aptos address cannot be empty");
        
        uint256 swapAmount = msg.value - wormholeFee;
        bytes memory payload = abi.encode(msg.sender, swapAmount, aptosAddress);
        
        uint64 sequence = IWormholeBridge(wormholeBridge).publishMessage{
            value: wormholeFee
        }(uint32(block.timestamp), payload, 1);
        
        emit SwapInitiated(msg.sender, swapAmount, aptosAddress, sequence);
    }

    function reverseSwap(
        string memory aptosSender, 
        address payable ethReceiver, 
        uint256 amount
    ) public onlyOwner {
        require(ethReceiver != address(0), "Invalid receiver address");
        require(bytes(aptosSender).length > 0, "Aptos sender cannot be empty");
        require(amount > 0, "Amount must be greater than 0");
        require(address(this).balance >= amount, "Insufficient contract balance");
        
        ethReceiver.transfer(amount);
        emit SwapReversed(aptosSender, ethReceiver, amount);
    }

    function setWormholeFee(uint256 _newFee) public onlyOwner {
        wormholeFee = _newFee;
        emit WormholeFeeUpdated(_newFee);
    }

    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        address previousOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(previousOwner, newOwner);
    }

    function withdraw() public onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        payable(owner).transfer(balance);
    }

    function getContractBalance() public view returns (uint256) {
        return address(this).balance;
    }

    // Emergency function to receive ETH
    receive() external payable {}
}

// Deploying with account: 0x11C46CB90A9DE1E2191b6545A91Ae67F6eC1Cb98
// Account balance: 0.053332918533793311 ETH

// 🔍 Etherscan: https://sepolia.etherscan.io/address/0xF011379e3bfE345B426a40198C253791Ba14FEcD

// ✅ Contract deployed successfully!