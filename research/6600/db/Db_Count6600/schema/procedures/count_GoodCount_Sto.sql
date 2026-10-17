-- SQL_STORED_PROCEDURE dbo.count_GoodCount_Sto (modified 2012-04-21T07:53:24.827)



CREATE proc [dbo].[count_GoodCount_Sto]


@Begin_Date DateTime,
@End_Date DateTime,
@intType int           --0为统计所有物品，1为统计装备，2为统计道具，3为统计武器
as
If (@Begin_Date>@End_Date)
      Return  
if(@intType=1)

---统计装备
begin
select a.Moneys,a.GiftToken,a.Offer,a.OtherPay,a.Gold,a.goodId,Convert(char(10),EnterTime,120) as EnterTime,a.Datas,b.Name,CategoryID into #temp  from db_logs.dbo.log_money as a right join db_count.dbo.tank_cPropertyGood_view as b on a.goodid = b.templateid

select goodid,Name,sum(Datas) as Total,sum(Moneys) as countMoney,sum(GiftToken) as countGiftToken,sum(Offer) as countOffer,count(OtherPay) as countOtherPay,sum(Gold) as countGold into #temp1 from #temp where EnterTime >= @Begin_Date and EnterTime <= @End_Date group by goodId,Name

select a.templateid as TemplateID,a.Name,b.Total as LoginCount,b.countMoney,b.countGiftToken,b.countOffer,b.countOtherPay,b.countGold from db_count.dbo.tank_cPropertyGood_view as a left join #temp1 as b on a.templateid = b.goodid order by b.total desc

drop table #temp

drop table #temp1

end

if(@intType=2)

--统计道具
begin
select a.Moneys,a.GiftToken,a.Offer,a.OtherPay,a.Gold,a.goodId,Convert(char(10),EnterTime,120) as EnterTime,a.Datas,b.Name,CategoryID into #temp2 from db_logs.dbo.log_money as a right join db_count.dbo.tank_cMountingGood_view as b on a.goodid = b.templateid

select goodid,Name,sum(Datas) as Total,sum(Moneys) as countMoney,sum(GiftToken) as countGiftToken,sum(Offer) as countOffer,count(OtherPay) as countOtherPay,sum(Gold) as countGold into #temp3 from #temp2 where EnterTime >= @Begin_Date and EnterTime <= @End_Date group by goodId,Name

select a.templateid as TemplateID,a.Name,b.Total as LoginCount,b.countMoney,b.countGiftToken,b.countOffer,b.countOtherPay,b.countGold from db_count.dbo.tank_cMountingGood_view as a left join #temp3 as b on a.templateid = b.goodid order by b.total desc

drop table #temp2

drop table #temp3

end

if(@intType=3)

begin
--统计武器
select a.Moneys,a.GiftToken,a.Offer,a.OtherPay,a.Gold,a.goodId,Convert(char(10),EnterTime,120) as EnterTime,a.Datas,b.Name,CategoryID into #temp4 from db_logs.dbo.log_money as a right join db_count.dbo.tank_cWeaponsGood_view as b on a.goodid = b.templateid

select goodid,Name,sum(Datas) as Total,sum(Moneys) as countMoney,sum(GiftToken) as countGiftToken,sum(Offer) as countOffer,count(OtherPay) as countOtherPay,sum(Gold) as countGold into #temp5 from #temp4 where EnterTime >= @Begin_Date and EnterTime <= @End_Date group by goodId,Name

select a.templateid as TemplateID,a.Name,b.Total as LoginCount,b.countMoney,b.countGiftToken,b.countOffer,b.countOtherPay,b.countGold from db_count.dbo.tank_cWeaponsGood_view as a left join #temp5 as b on a.templateid = b.goodid order by b.total desc

drop table #temp4

drop table #temp5

end

if(@intType=0)
begin
--统计所有物品
select a.Moneys,a.GiftToken,a.Offer,a.OtherPay,a.Gold,a.goodId,Convert(char(10),EnterTime,120) as EnterTime,a.Datas,b.Name,CategoryID into #temp6 from db_logs.dbo.log_money as a right join db_count.dbo.ddt_shopgoods_new_view as b on a.goodid = b.id


select goodid,Name,sum(Datas) as Total,sum(Moneys) as countMoney,sum(GiftToken) as countGiftToken,sum(Offer) as countOffer,count(OtherPay) as countOtherPay,sum(Gold) as countGold into #temp7 from #temp6 where EnterTime >= @Begin_Date and EnterTime <= @End_Date group by goodId,Name


select b.goodid as TemplateID,b.Name,b.Total as LoginCount,b.countMoney,b.countGiftToken,b.countOffer,b.countOtherPay,b.countGold from db_count.dbo.ddt_shopgoods_new_view as a left join #temp7 as b on a.id = b.goodid order by b.total desc

drop table #temp6

drop table #temp7

end





GO
