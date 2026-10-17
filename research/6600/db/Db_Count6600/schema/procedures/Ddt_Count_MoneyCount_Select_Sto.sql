-- SQL_STORED_PROCEDURE dbo.Ddt_Count_MoneyCount_Select_Sto (modified 2012-04-21T07:53:24.810)
CREATE  PROCEDURE Ddt_Count_MoneyCount_Select_Sto 
@BeginDate datetime,
@EndDate datetime
as

--临时变量声明
--当天数据
declare @ChargeMoneyEnd varchar(50) --玩家当天充值点卷数量
declare @GmMoneyEnd varchar(50) --GM后台的赠送点卷
declare @ShopMoneyEnd varchar(50) --商城购买物品所消耗的点卷数量
declare @MarryMoneyEnd varchar(50) --婚礼消耗点卷(包括创建婚礼，结婚典礼，礼炮，离婚)
declare @ComposeMoneyEnd varchar(50) --属性转移
declare @ConsoritaMoneyEnd varchar(50) --公会捐献
declare @ExpiredMailMoneyEnd varchar(50) --过期邮件损失
declare @deleterMailMoneyEnd varchar(50) --误删邮件的损失(暂不加)
declare @PlayerMoneyEnd varchar(50)  --玩家账号剩余点数
declare @AuctionMoneyEnd varchar(50) --未成交的竞拍点卷
declare @InMailMoneyEnd varchar(50) --寄出但未提取的点卷
--昨天数据
declare @PlayerMoneyBegin varchar(50)  --玩家账号剩余点数
declare @AuctionMoneyBegin varchar(50) --未成交的竞拍点卷
declare @InMailMoneyBegin varchar(50) --寄出但未提取的点卷

select @ChargeMoneyEnd=chargeMoney,@GmMoneyEnd=gmmoney,@ShopMoneyEnd=shopmoney,@MarryMoneyEnd=marrymoney,@ComposeMoneyEnd=composemoney,
@ConsoritaMoneyEnd=consoritamoney,@ExpiredMailMoneyEnd=expiredmailmoney,@deleterMailMoneyEnd=deletermailmoney,@PlayerMoneyEnd=playermoney,
@AuctionMoneyEnd=auctionmoney,@InMailMoneyEnd=inmailmoney
from db_count..count_moneycount
where enddate=@EndDate

select @PlayerMoneyBegin=playermoney,@AuctionMoneyBegin=auctionmoney,@InMailMoneyBegin=inmailmoney from db_count..count_moneycount
where enddate=@BeginDate

select 
@ChargeMoneyEnd as ChargeMoneyEnd,
@GmMoneyEnd as GmMoneyEnd,
@ShopMoneyEnd as ShopMoneyEnd,
@MarryMoneyEnd as MarryMoneyEnd,
@ComposeMoneyEnd as ComposeMoneyEnd,
@ConsoritaMoneyEnd as ConsoritaMoneyEnd,
@ExpiredMailMoneyEnd as ExpiredMailMoneyEnd,
@deleterMailMoneyEnd as deleterMailMoneyEnd,
@PlayerMoneyEnd as PlayerMoneyEnd,
@AuctionMoneyEnd as AuctionMoneyEnd,
@InMailMoneyEnd as InMailMoneyEnd,
@PlayerMoneyBegin as PlayerMoneyBegin,
@AuctionMoneyBegin as AuctionMoneyBegin,
@InMailMoneyBegin as InMailMoneyBegin
into #temp

select * from #temp

drop table #temp



GO
