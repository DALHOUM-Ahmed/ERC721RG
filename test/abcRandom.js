const fs = require("fs");
const hre = require("hardhat");
const { expect } = require("chai");
const ethers = hre.ethers;
const BigNumber = ethers.BigNumber;
const { getContractAddress } = require("@ethersproject/address");

const delay = (duration = 1000) => {
  console.log(`delaying for ${duration}ms`);
  return new Promise((res) => {
    setTimeout(() => {
      console.log("delay finished");
      res();
    }, duration);
  });
};

const moveTime = async (time) => {
  await ethers.provider.send("evm_increaseTime", [time]);
  await ethers.provider.send("evm_mine");
};

const loadContract = async (path, address) => {
  const contractAddress = address;
  const contractABIfile = fs.readFileSync(path, "utf8");
  const contractABI = JSON.parse(contractABIfile);
  const contract = await ethers.getContractAt(contractABI, contractAddress);
  return contract;
};

describe("Sweply private round vest", function () {
  let owner, normalSigner, signerWithDiscount, signerWithEarlyMint, abc;

  beforeEach(async function () {
    [
      owner,
      normalSigner,
      signerWithDiscount,
      signerWithEarlyMint,
      signerWithBoth,
    ] = await ethers.getSigners();

    let factory = await ethers.getContractFactory(
      "contracts/abcRandom.sol:ERC721RG"
    );
    abc = await factory.connect(owner).deploy();

    await ethers.provider.send("evm_mine");
  });

  // [
  //   '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  //   '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
  //   '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
  //   '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
  //   '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65'
  // ]

  it("Should allow normal signer to buy after launch", async function () {
    await abc.connect(owner).toggleLaunch();
    await abc
      .connect(normalSigner)
      .publicMint(
        [1, 2, 2],
        ["0x0000000000000000000000000000000000000000000000000000000000000000"],
        0,
        ["0x0000000000000000000000000000000000000000000000000000000000000000"],
        { value: ethers.BigNumber.from("5000000000000000000") }
      );
    expect(await abc.balanceOf(normalSigner.address)).to.be.eq(3);
  });

  //this signer have 1% discount
  it("Should allow to have discount with discount-proof after launch", async function () {
    await abc.connect(owner).toggleLaunch();
    await abc
      .connect(signerWithDiscount)
      .publicMint(
        [1, 2, 3],
        [
          "0x1428975b69ccaa80e5613347ec07d7a0696894fc28b3655983d43f9eb00032a1",
          "0x58a7c8864efc6327f9a1832495639828697a95d2743d03d3258061392a24de25",
          "0x1b6288644e6514c53046a8049fc164e5c9700696b2fa24f172086e314cedd98b",
          "0xd27bca560012af6ffa7a7d312d4c931b5a6da92e894f25c3642135f4c2ca6b18",
        ],
        1,
        ["0x0000000000000000000000000000000000000000000000000000000000000000"],
        { value: ethers.BigNumber.from("5990000000000000000") }
      );
    expect(await abc.balanceOf(signerWithDiscount.address)).to.be.eq(3);
  });

  it("Should allow to have early mint", async function () {
    await abc
      .connect(signerWithEarlyMint)
      .publicMint(
        [1, 2, 3],
        ["0x0000000000000000000000000000000000000000000000000000000000000000"],
        0,
        [
          "0x00314e565e0574cb412563df634608d76f5c59d9f817e85966100ec1d48005c0",
          "0xcdaf6a8233ca8d49bb607938e7e63df5674a146b32386474303b22b9628c183c",
          "0xf4ca8532861558e29f9858a3804245bb30f0303cc71e4192e41546237b6ce58b",
        ],
        { value: ethers.BigNumber.from("6000000000000000000") }
      );
    expect(await abc.balanceOf(signerWithEarlyMint.address)).to.be.eq(3);
  });

  // this signer have 5% discount
  it("Should allow to have both early mint and discount", async function () {
    await abc
      .connect(signerWithBoth)
      .publicMint(
        [2, 2, 1],
        [
          "0x320723cfc0bfa9b0f7c5b275a01ffa5e0f111f05723ba5df2b2684ab86bebe06",
          "0x58a7c8864efc6327f9a1832495639828697a95d2743d03d3258061392a24de25",
          "0x1b6288644e6514c53046a8049fc164e5c9700696b2fa24f172086e314cedd98b",
          "0xd27bca560012af6ffa7a7d312d4c931b5a6da92e894f25c3642135f4c2ca6b18",
        ],
        1,
        ["0xd693f87bcfc7cbff14feba02a12feb529fa68c5666ea3210d3d5e8e69dc19240"],
        { value: ethers.BigNumber.from("4950000000000000000") }
      );
    expect(await abc.balanceOf(signerWithBoth.address)).to.be.eq(3);
  });

  it("Should allow owner to update discount root", async function () {
    await abc
      .connect(owner)
      .updateDiscountRoot(
        "0xae835210cb5e471aa81aca93a350342c8be6f971138d10410beadd7cd48d965a"
      );

    expect(await abc.discountRoot()).to.be.eq(
      "0xae835210cb5e471aa81aca93a350342c8be6f971138d10410beadd7cd48d965a"
    );
  });

  it("Should allow owner to update discount root giving a user a 100% discount", async function () {
    await abc.connect(owner).toggleLaunch();
    await abc
      .connect(owner)
      .updateDiscountRoot(
        "0xae835210cb5e471aa81aca93a350342c8be6f971138d10410beadd7cd48d965a"
      );

    expect(await abc.discountRoot()).to.be.eq(
      "0xae835210cb5e471aa81aca93a350342c8be6f971138d10410beadd7cd48d965a"
    );

    await abc
      .connect(signerWithDiscount)
      .publicMint(
        [1, 2, 3],
        [
          "0x1428975b69ccaa80e5613347ec07d7a0696894fc28b3655983d43f9eb00032a1",
          "0x58a7c8864efc6327f9a1832495639828697a95d2743d03d3258061392a24de25",
          "0x1b6288644e6514c53046a8049fc164e5c9700696b2fa24f172086e314cedd98b",
          "0xd27bca560012af6ffa7a7d312d4c931b5a6da92e894f25c3642135f4c2ca6b18",
        ],
        1,
        ["0x0000000000000000000000000000000000000000000000000000000000000000"],
        { value: ethers.BigNumber.from("5000000000000000000") }
      );
    expect(await abc.balanceOf(signerWithDiscount.address)).to.be.eq(3);
  });

  it("Should allow owner to pause the sell after launch", async function () {
    await abc.connect(owner).toggleLaunch();

    await abc.connect(owner).setPaused(true);

    await expect(
      abc
        .connect(normalSigner)
        .publicMint(
          [1, 2, 2],
          [
            "0x0000000000000000000000000000000000000000000000000000000000000000",
          ],
          0,
          [
            "0x0000000000000000000000000000000000000000000000000000000000000000",
          ],
          { value: ethers.BigNumber.from("5000000000000000000") }
        )
    ).to.be.revertedWith("Minting is paused");
  });

  it("Should allow owner to set unrevealed base uri", async function () {
    await abc.connect(owner).setUnrevealedURIs("new-unrevealed-base-uri/");

    expect(await abc._unRevealedBaseURI()).to.be.eq("new-unrevealed-base-uri/");
  });

  it("Should allow owner to reveal setting new base uri", async function () {
    await abc.connect(owner).setBaseURIs(true, "new-revealed-base-uri/");

    expect(await abc._URI()).to.be.eq("new-revealed-base-uri/");
    expect(await abc.revealed()).to.be.eq(true);
  });

  it("Should allow owner to roll back to unrevealed images after reveal", async function () {
    await abc.connect(owner).setBaseURIs(true, "new-revealed-base-uri/");

    expect(await abc._URI()).to.be.eq("new-revealed-base-uri/");
    expect(await abc.revealed()).to.be.eq(true);

    await abc.connect(owner).toggleRevealed();

    expect(await abc.revealed()).to.be.eq(false);
  });

  it("Owner should be able to pause everyone including early minters", async function () {
    await abc.connect(owner).setPaused(true);

    await expect(
      abc
        .connect(signerWithEarlyMint)
        .publicMint(
          [1, 2, 3],
          [
            "0x0000000000000000000000000000000000000000000000000000000000000000",
          ],
          0,
          [
            "0x00314e565e0574cb412563df634608d76f5c59d9f817e85966100ec1d48005c0",
            "0xcdaf6a8233ca8d49bb607938e7e63df5674a146b32386474303b22b9628c183c",
            "0xf4ca8532861558e29f9858a3804245bb30f0303cc71e4192e41546237b6ce58b",
          ],
          { value: ethers.BigNumber.from("6000000000000000000") }
        )
    ).to.be.revertedWith("Minting is paused");
  });

  it("Should allow owner to update discount root giving a user a 50% discount", async function () {
    await abc.connect(owner).toggleLaunch();
    await abc
      .connect(owner)
      .updateDiscountRoot(
        "0x15ef9816c60d4141c4ef3117eab2dd57bfb84d62b2a4f03ae4765413b629b52d"
      );

    expect(await abc.discountRoot()).to.be.eq(
      "0x15ef9816c60d4141c4ef3117eab2dd57bfb84d62b2a4f03ae4765413b629b52d"
    );

    await abc
      .connect(signerWithDiscount)
      .publicMint(
        [1, 2, 3],
        [
          "0x1428975b69ccaa80e5613347ec07d7a0696894fc28b3655983d43f9eb00032a1",
          "0x58a7c8864efc6327f9a1832495639828697a95d2743d03d3258061392a24de25",
          "0x1b6288644e6514c53046a8049fc164e5c9700696b2fa24f172086e314cedd98b",
          "0xd27bca560012af6ffa7a7d312d4c931b5a6da92e894f25c3642135f4c2ca6b18",
        ],
        1,
        ["0x0000000000000000000000000000000000000000000000000000000000000000"],
        { value: ethers.BigNumber.from("5500000000000000000") }
      );
    expect(await abc.balanceOf(signerWithDiscount.address)).to.be.eq(3);
  });
});
