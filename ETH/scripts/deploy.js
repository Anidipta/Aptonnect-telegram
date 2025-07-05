const { ethers } = require("hardhat");

async function main() {
  console.log("Starting SepoliaSwap deployment...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  // Fixed: Use provider.getBalance instead of deployer.getBalance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");
  
  // Constructor parameters
  const wormholeBridge = "0x4a8bc80Ed5a4067f1CCf107057b8270E0cC11A78";
  const wormholeFee = ethers.parseEther("0.001"); // 0.001 ETH in wei (adjust as needed)
  
  console.log("Constructor parameters:");
  console.log("- Wormhole Bridge:", wormholeBridge);
  console.log("- Wormhole Fee:", ethers.formatEther(wormholeFee), "ETH");
  
  // Deploy with correct parameters
  const SepoliaSwap = await ethers.getContractFactory("SepoliaSwap");
  const sepoliaSwap = await SepoliaSwap.deploy(wormholeBridge, wormholeFee);
  
  console.log("Waiting for deployment...");
  await sepoliaSwap.waitForDeployment();
  
  // Fixed: Use getAddress() instead of .address for newer ethers versions
  const contractAddress = await sepoliaSwap.getAddress();
  console.log("✅ SepoliaSwap deployed to:", contractAddress);
  console.log("🔍 Etherscan:", `https://sepolia.etherscan.io/address/${contractAddress}`);
  
  console.log("\n📋 Deployment Summary:");
  console.log("Contract Address:", contractAddress);
  console.log("Network: Sepolia");
  console.log("Owner:", deployer.address);
  console.log("Wormhole Bridge:", wormholeBridge);
  console.log("Wormhole Fee:", ethers.formatEther(wormholeFee), "ETH");
  
  console.log("\n✅ Contract deployed successfully!");
  console.log("Note: Users need to send more than", ethers.formatEther(wormholeFee), "ETH to cover Wormhole fees.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });