-- SQL_STORED_PROCEDURE dbo.count_goodPay_sto (modified 2012-04-21T07:53:24.827)
CREATE proc [dbo].[count_goodPay_sto]
--查询所有物品销售金额
@Begin_Date DateTime,@End_Date DateTime
--set @Begin_Date = '2010-03-16'
--set @End_Date = '2010-03-17'
as

select goodId,sum(Moneys) as countMoney,sum(GiftToken) as countGiftToken,sum(Offer) as countOffer,count(OtherPay) as countOtherPay,sum(Gold) as countGold,convert(char(10),EnterTime,120) as EnterTime
into #temp from db_logs.dbo.log_money  group by goodId,convert(char(10),EnterTime,120)

select goodId,sum(countMoney) as countMoney,sum(countGiftToken) as countGiftToken,sum(countOffer) as countOffer,sum(countOtherPay) as countOtherPay,sum(countGold) as countGold
into #temp1 from #temp where EnterTime >= @Begin_Date and EnterTime <= @End_Date group by goodId
select a.id as goodId,a.Name,b.countMoney,b.countGiftToken,b.countOffer,b.countOtherPay,b.countGold from ddt_shopgoods_new_view as a left join #temp1 as b on a.id = b.goodid order by b.countMoney desc

drop table #temp 
drop table #temp1




GO
