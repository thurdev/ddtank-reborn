-- SQL_STORED_PROCEDURE dbo.Ddt_Count_MoneyCount_Insert_Sto (modified 2012-04-21T07:53:24.810)


CREATE  PROCEDURE Ddt_Count_MoneyCount_Insert_Sto 
as
--查询时间
declare @date datetime
set @date=convert(varchar(10),getdate(),120)
declare @date2 datetime
set @date2='05:00:00'

declare @EndDate datetime
set @EndDate=@date+@date2
declare @BeginDate datetime
set @BeginDate=@EndDate-1

--临时变量声明
declare @ChargeMoney varchar(50) --玩家当天充值点卷数量
declare @GmMoney varchar(50) --GM后台的赠送点卷
declare @ShopMoney varchar(50) --商城购买物品所消耗的点卷数量
declare @MarryMoney varchar(50) --婚礼消耗点卷(包括创建婚礼，结婚典礼，礼炮，离婚)
declare @ComposeMoney varchar(50) --属性转移
declare @ConsoritaMoney varchar(50) --公会捐献
declare @ExpiredMailMoney varchar(50) --过期邮件损失
declare @deleterMailMoney varchar(50) --误删邮件的损失(暂不加)
declare @PlayerMoney varchar(50)  --玩家账号剩余点数
declare @AuctionMoney varchar(50) --未成交的竞拍点卷
declare @InMailMoney varchar(50) --寄出但未提取的点卷

--临时变量暂存
--增加量
--玩家当天充值点卷数量
select @ChargeMoney=sum(money) from db_tank_copy..charge_money where money>0 and date>@BeginDate
if(@ChargeMoney is null)
begin
set @ChargeMoney=0
end

--GM后台的赠送点卷
select @GmMoney=sum(money) from db_count..ddt_tank_sendgoodsrecord_view where money>0 and senddate>@BeginDate
if(@GmMoney is null)
begin
set @GmMoney=0
end
--减少量
--商城购买物品所消耗的点卷数量

select @ShopMoney=sum(money) from db_count..count_shop where money>0 and entertime>@BeginDate
if(@ShopMoney is null)
begin
set @ShopMoney=0
end
--婚礼消耗点卷(包括创建婚礼，结婚典礼，礼炮，离婚)
select @MarryMoney=sum(point) from db_count..count_systempay where masttype=0 and point>0 and  sontype in (0,1,2,3) and paytime>@BeginDate
if(@MarryMoney is null)
begin
set @MarryMoney=0
end

--属性转移
select @ComposeMoney=sum(point) from db_count..count_systempay where point>0 and masttype=1 and sontype=4 and paytime>@BeginDate
if(@ComposeMoney is null)
begin
set @ComposeMoney=0
end

--公会捐献
select @ConsoritaMoney=sum(point) from db_count..count_systempay where point>0 and masttype=2 and sontype=5 and paytime>@BeginDate
if(@ConsoritaMoney is null)
begin
set @ConsoritaMoney=0
end

--过期邮件损失
select @ExpiredMailMoney=sum(money) from db_tank_copy..user_messages where money>0 and isexist=1  and type!=101 and (sendtime+validdate/24)>@BeginDate and  (sendtime+validdate/24)<@EndDate 
if(@ExpiredMailMoney is null)
begin
set @ExpiredMailMoney=0
end

--误删邮件的损失(暂不加)
--select @deleterMailMoney=sum(money) from db_tank_copy..user_messages where isexist=0 and type!=101 and money>0 and deleteTime>@BeginDate and deleteTime<@EndDate
--if(@deleterMailMoney is null)
--begin
set @deleterMailMoney=0
--end

--//////存量
--玩家账号剩余点数
select @PlayerMoney=sum(money/10000) from db_tank_copy..sys_users_detail
if(@PlayerMoney is null)
begin
set @PlayerMoney=0
end

--未成交的竞拍点卷
select @AuctionMoney=sum(rise) from db_tank_copy..auction where isexist=1
if(@AuctionMoney is null)
begin
set @AuctionMoney=0
end

--寄出但未提取的点卷
select @InMailMoney=sum(money) from db_tank_copy..user_messages where (sendtime+validdate/24)>@date and isexist=1
if(@InMailMoney is null)
begin
set @InMailMoney=0
end

--利用临时变量insert表
insert into db_count..Count_MoneyCount(ChargeMoney,GmMoney,ShopMoney,MarryMoney,ComposeMoney,ConsoritaMoney,ExpiredMailMoney,DeleterMailMoney,PlayerMoney,AuctionMoney,InMailMoney,BeginDate,EndDate)
values(@ChargeMoney,@GmMoney,@ShopMoney,@MarryMoney,@ComposeMoney,@ConsoritaMoney,@ExpiredMailMoney,@deleterMailMoney,@PlayerMoney,@AuctionMoney,@InMailMoney,@BeginDate,@EndDate)


GO
