const hre = require("hardhat");

async function main() {
  console.log("Deploying GameM...");

  const GameM = await hre.ethers.getContractFactory("GameM");
  const gamem = await GameM.deploy();

  await gamem.waitForDeployment();

  const address = await gamem.getAddress();
  const tokenAddress = await gamem.tokenAddress();

  console.log(`GameM deployed to: ${address}`);
  console.log(`EggCoin deployed to: ${tokenAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
