const { expect } = require("chai");
const { ethers } = require("hardhat");

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), "ether");
};

describe("Exchange", () => {
  let deployer, feeAaccount, exchange;

  const feePercent = 10;

  beforeEach(async () => {
    const Exchange = await ethers.getContractFactory("Exchange");
    const Token = await ethers.getContractFactory("Token");

    token1 = await Token.deploy("Dapp University", "DAPP", "1000000");
    token2 = await Token.deploy("Mock Dai", "mDAI", "1000000");

    // from Token.js
    // accounts = await ethers.getSigners();
    // deployer = accounts[0];
    // receiver = accounts[1];
    // exchange = accounts[2];

    accounts = await ethers.getSigners();
    deployer = accounts[0];
    feeAccount = accounts[1];
    user1 = accounts[2];
    user2 = accounts[3];

    let transaction = await token1
      .connect(deployer)
      .transfer(user1.address, tokens(100));
    await transaction.wait();

    exchange = await Exchange.deploy(feeAccount.address, feePercent);
  });

  describe("Deployment", () => {
    it("tracks the fee account", async () => {
      expect(await exchange.feeAccount()).to.equal(feeAccount.address);
    });

    it("tracks the fee percent", async () => {
      expect(await exchange.feePercent()).to.equal(feePercent);
    });
  });

  describe("Depositing Tokens", () => {
    let transaction, result;
    let amount = tokens(10);

    describe("Success", () => {
      beforeEach(async () => {
        //approve tokens
        transaction = await token1
          .connect(user1)
          .approve(exchange.address, amount);
        result = await transaction.wait();

        //deposit tokens
        transaction = await exchange
          .connect(user1)
          .depositToken(token1.address, amount);
        result = await transaction.wait();
      });

      it("tracks the token deposit", async () => {
        expect(await token1.balanceOf(exchange.address)).to.equal(amount);
        expect(await exchange.tokens(token1.address, user1.address)).to.equal(amount);
        expect( await exchange.balanceOf(token1.address, user1.address)).to.equal(amount);
      });

      it("emits a deposit event", async () => {
        const event = result.events[1];
        expect(event.event).to.equal("Deposit");
        expect(event.args.user).to.equal(user1.address);
        expect(event.args.token).to.equal(token1.address);
        expect(event.args.amount).to.equal(amount);
        expect(event.args.balance).to.equal(amount);
      });
    });

    describe("Failure", () => {
      it("fails when no tokens are approved", async () => {
        await expect(exchange.connect(user1).depositToken(token1.address, amount)).to.be.reverted;
      });
    });
  });

  describe("Withdrawing Tokens", () => {
    let transaction, result;
    let amount = tokens(10);

    describe("Success", () => {
      beforeEach(async () => {
        //deposit tokens before withdrawal
        
        //approve tokens
        transaction = await token1
          .connect(user1)
          .approve(exchange.address, amount);
        result = await transaction.wait();
        //deposit tokens
        transaction = await exchange
          .connect(user1)
          .depositToken(token1.address, amount);
        result = await transaction.wait();

        // now withdraw tokens
        transaction = await exchange
          .connect(user1)
          .withdrawToken(token1.address, amount);
        result = await transaction.wait();
      });

      it("withdraw token funds", async () => {
        expect(await token1.balanceOf(exchange.address)).to.equal(0);
        expect(await exchange.tokens(token1.address, user1.address)).to.equal(0);
        expect(await exchange.balanceOf(token1.address, user1.address)).to.equal(0);
      });

      it("emits a withdraw event", async () => {
        const event = result.events[1];
        expect(event.event).to.equal("Withdraw");
        expect(event.args.user).to.equal(user1.address);
        expect(event.args.token).to.equal(token1.address);
        expect(event.args.amount).to.equal(amount);
        expect(event.args.balance).to.equal(0);
      });
    });

    describe("Failure", () => {
      it("fails for insufficient balances", async () => {
        await expect(exchange.connect(user1).withdrawToken(token1.address, amount)).to.be.reverted;
      });
    });
  });

  describe("Checking Balances", () => {
    let transaction, result;
    let amount = tokens(1);

    beforeEach(async () => {
      //approve tokens
      transaction = await token1
        .connect(user1)
        .approve(exchange.address, amount);
      result = await transaction.wait();

      //deposit tokens
      transaction = await exchange
        .connect(user1)
        .depositToken(token1.address, amount);
      result = await transaction.wait();
    });

    it("returns user balance", async () => {
      expect(await exchange.balanceOf(token1.address, user1.address)).to.equal(amount);
    });
  });

  //-------------------------------
  // ORDERS
  //-------------------------------

  describe("Making orders", () => {
    let transaction, result;
    let amount = tokens(1);

    describe("Success", () => {
      beforeEach(async () => {
        //deposit tokens before order
        //approve tokens
        transaction = await token1
          .connect(user1)
          .approve(exchange.address, amount);
        result = await transaction.wait();
        //deposit tokens
        transaction = await exchange
          .connect(user1)
          .depositToken(token1.address, amount);
        result = await transaction.wait();

        //make order
        transaction = await exchange
          .connect(user1)
          .makeOrder(token2.address, amount, token1.address, amount);
        result = await transaction.wait();
      });

      it("tracks newly created order", async () => {
        expect(await exchange.orderCount()).to.equal(1);
      });

      it("emits a order event", async () => {
        const event = result.events[0];
        expect(event.event).to.equal("Order");
        expect(event.args.id).to.equal(1);
        expect(event.args.user).to.equal(user1.address);
        expect(event.args.tokenGet).to.equal(token2.address);
        expect(event.args.amountGet).to.equal(tokens(1));
        expect(event.args.tokenGive).to.equal(token1.address);
        expect(event.args.amountGive).to.equal(tokens(1));
        expect(event.args.timestamp).to.at.least(1);
      });
    });

    describe("Failure", async () => {
      it("rejects with no balance", async () => {
          await expect(exchange.connect(user1).makeOrder(token2.address, tokens(1), token1.address, token(1))).to.be.reverted;
        });
      });
    });

  describe("Order actions", () => {
    let transaction, result;
    let amount = tokens(1);

    beforeEach(async () => {
      // user1 deposits tokens
      transaction = await token1
        .connect(user1)
        .approve(exchange.address, amount);
      result = await transaction.wait();

      transaction = await exchange
        .connect(user1)
        .depositToken(token1.address, amount);
      result = await transaction.wait();

      // Give tokens to user2
      transaction = await token2
        .connect(deployer)
        .transfer(user2.address, tokens(100));
      result = await transaction.wait();

      // user2 deposits tokens
      transaction = await token2
        .connect(user2)
        .approve(exchange.address, tokens(2));
      result = await transaction.wait();

      transaction = await exchange
        .connect(user2)
        .depositToken(token2.address, tokens(2));
      result = await transaction.wait();

      // Make an order
      transaction = await exchange
        .connect(user1)
        .makeOrder(token2.address, amount, token1.address, amount);
      result = await transaction.wait();
    });

    describe("Cancelling orders", async () => {
      describe("Success", async () => {
        beforeEach(async () => {
          transaction = await exchange.connect(user1).cancelOrder(1);
          result = await transaction.wait();
        });

        it("updates cancelled orders", async () => {
          expect(await exchange.orderCancelled(1)).to.equal(true);
        });

        it("emits a cancel event", async () => {
          const event = result.events[0];
          expect(event.event).to.equal("Cancel");
          expect(event.args.id).to.equal(1);
          expect(event.args.user).to.equal(user1.address);
          expect(event.args.tokenGet).to.equal(token2.address);
          expect(event.args.amountGet).to.equal(token(1));
          expect(event.args.tokenGive).to.equal(token1.address);
          expect(event.args.amountGive).to.equal(token(1));
          expect(event.args.timestamp).to.at.least(1);
        });
      });

      describe("Failure", () => {
        beforeEach(async () => {
          //user1 deposits tokens before order
          //approve tokens
          transaction = await token1
            .connect(user1)
            .approve(exchange.address, amount);
          result = await transaction.wait();

          //deposit tokens
          transaction = await exchange
            .connect(user1)
            .depositToken(token1.address, amount);
          result = await transaction.wait();

          //make order
          transaction = await exchange
            .connect(user1)
            .makeOrder(token2.address, amount, token1.address, amount);
          result = await transaction.wait();
        });

        it("rejects invalid order ids", async () => {
          const invalidOrderId = 99999;
          await expect(exchange.connect(user1).cancelOrder(invalidOrderId)).to.be.reverted;
        });

        it("rejects unauthorised cancellations", async () => {
          await expect(exchange.connect(user2).cancelOrder(1)).to.be.reverted;
        });
      });
    });

    describe("Filling orders", () => {
      describe("Success", () => {
        beforeEach(async () => {
          // user2 fills order
          transaction = await exchange.connect(user2).fillOrder("1");
          result = await transaction.wait();
        });

        it("Executes the trade and charge fees", async () => {
          // token give
          expect(await exchange.balanceOf(token1.address, user1.address)).to.equal(tokens(0));
          expect(await exchange.balanceOf(token1.address, user2.address)).to.equal(tokens(1));
          expect(await exchange.balanceOf(token1.address, feeAccount.address)).to.equal(tokens(0));
          // token get
          expect(await exchange.balanceOf(token2.address, user1.address)).to.equal(tokens(1));
          expect(await exchange.balanceOf(token2.address, user2.address)).to.equal(tokens(0.9));
          expect(await exchange.balanceOf(token2.address, feeAccount.address)).to.equal(tokens(0.1));
        });

        it("updates filled orders", async () => {
          expect(await exchange.orderFilled(1)).to.equal(true);
        });

        it("emits a trade event", async () => {
          const event = result.events[0];
          expect(event.event).to.equal("Trade");
          expect(event.args.id).to.equal(1);
          expect(event.args.user).to.equal(user2.address);
          expect(event.args.tokenGet).to.equal(token2.address);
          expect(event.args.amountGet).to.equal(tokens(1));
          expect(event.args.tokenGive).to.equal(token1.address);
          expect(event.args.amountGive).to.equal(tokens(1));
          expect(event.args.creator).to.equal(user1.address);
          expect(event.args.timestamp).to.at.least(1);
        });
      });

      describe("Failure", () => {
        it("rejects invalid order ids", async () => {
          const invalidOrderId = 99999;
          await expect(exchange.connect(user2).fillOrder(invalidOrderId)).to.be.reverted;
        });

        it("rejects already filled orders", async () => {
          transaction = await exchange.connect(user2).fillOrder(1);
          await transaction.wait();
          await expect(exchange.connect(user2).fillOrder(1)).to.be.reverted;
        });

        it("rejects cancelled orders", async () => {
          transaction = await exchange.connect(user1).cancelOrder(1);
          await transaction.wait();
          await expect(exchange.connect(user2).fillOrder(1)).to.be.reverted;
        });
      });
    });
  });
});

