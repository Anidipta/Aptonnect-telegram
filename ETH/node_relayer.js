const { ethers } = require("ethers");

const provider = new ethers.providers.JsonRpcProvider("https://sepolia.infura.io/v3/YOUR_KEY");
const wallet = new ethers.Wallet("YOUR_PRIVATE_KEY", provider);
const contractAddress = "0xYourDeployedContract";
const abi = [
  "function reverseSwap(string,address,uint256) public",
];

const contract = new ethers.Contract(contractAddress, abi, wallet);

async function relayReverseSwap() {
  const ethReceiver = "0x11C46CB90A9DE1E2191b6545A91Ae67F6eC1Cb98";
  const aptosSender = "0x5230e5671a286097e5738728171bcafa66af9c6f1a96540b0b42b089d4915157";
  const amount = ethers.utils.parseEther("0.01");

  const tx = await contract.reverseSwap(aptosSender, ethReceiver, amount);
  console.log("Transaction hash:", tx.hash);
  await tx.wait();
  console.log("Confirmed");
}

relayReverseSwap();