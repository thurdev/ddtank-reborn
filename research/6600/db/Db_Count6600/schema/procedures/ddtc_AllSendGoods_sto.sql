-- SQL_STORED_PROCEDURE dbo.ddtc_AllSendGoods_sto (modified 2012-04-21T07:53:25.030)
CREATE proc ddtc_AllSendGoods_sto
@type int, --判断查询的类型
@getValues nvarchar(800) --获取所选择物品的ID
as
--为左边树查询武器
if(@type=1) 
begin
select TemplateID,NeedSex,CategoryID,Name from db_count.dbo.ddtc_AllshopGoods_view where CategoryID in(7,17)
end
--为左边树查询装备
if(@type=2) 
begin
select TemplateID,NeedSex,CategoryID,Name from db_count.dbo.ddtc_AllshopGoods_view where CategoryID in(1,2,3,4,5,6,8,9,13,14,15)
end
--为左边树查询道具
if(@type=3) 
begin
select TemplateID,NeedSex,CategoryID,Name from db_count.dbo.ddtc_AllshopGoods_view where CategoryID in(10,11,16)
end
--为选择的物品
if(@type=0 and @getValues is not null)
begin
select TemplateID,NeedSex,CategoryID,Name,CanStrengthen,CanCompose from db_tank_copy.dbo.shop_goods where patindex('%,'+rtrim(TemplateID)+',%',','+@getValues+',')>0
end

GO
