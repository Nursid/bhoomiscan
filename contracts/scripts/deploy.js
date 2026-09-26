const hre = require("hardhat");

async function main() {
  console.log("Deploying LandRegistry contract...");

  const LandRegistry = await hre.ethers.getContractFactory("LandRegistry");
  const landRegistry = await LandRegistry.deploy();

  await landRegistry.waitForDeployment();
  
  const address = await landRegistry.getAddress();
  
  console.log("LandRegistry deployed to:", address);
  console.log("Network:", hre.network.name);
  console.log("Transaction hash:", landRegistry.deploymentTransaction().hash);
  
  // Save deployment info
  const network = await hre.ethers.provider.getNetwork();
  const deploymentInfo = {
    network: hre.network.name,
    contractAddress: address,
    deploymentHash: landRegistry.deploymentTransaction().hash,
    timestamp: new Date().toISOString(),
    chainId: Number(network.chainId)
  };
  
  console.log("\nDeployment Info:", JSON.stringify(deploymentInfo, null, 2));
  
  // Verify contract on block explorer (for supported networks)
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\nTo verify contract on block explorer, run:");
    console.log(`npx hardhat verify --network ${hre.network.name} ${address}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
