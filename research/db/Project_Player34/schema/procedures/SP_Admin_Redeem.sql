-- SQL_STORED_PROCEDURE dbo.SP_Admin_Redeem (modified 2021-06-04T05:18:34.490)


-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<删档后奖励物品:已废>
-- =============================================
CREATE Procedure [dbo].[SP_Admin_Redeem]
as

set xact_abort on
begin tran

--装备
insert into Sys_Users_Goods(UserID,BagType,TemplateID,Place,[Count],IsJudge,Color,IsExist,StrengthenLevel,AttackCompose,DefendCompose,LuckCompose,AgilityCompose,IsBinds,BeginDate,ValidDate)
select UserID,0,case when sex=1 then  7001 else 7002 end,11,1,1,'',1,0,0,0,0,0,1,getdate(),0 from Sys_Users_Detail where IsFirst = 0

if @@error<>0
begin
  rollback tran
  select @@error
end

insert into Sys_Users_Goods(UserID,BagType,TemplateID,Place,[Count],IsJudge,Color,IsExist,StrengthenLevel,AttackCompose,DefendCompose,LuckCompose,AgilityCompose,IsBinds,BeginDate,ValidDate)
select UserID,0,case when sex=1 then  3101 else 3201 end,12,1,1,'',1,0,0,0,0,0,1,getdate(),0 from Sys_Users_Detail where IsFirst = 0

if @@error<>0
begin
  rollback tran
  select @@error
end

insert into Sys_Users_Goods(UserID,BagType,TemplateID,Place,[Count],IsJudge,Color,IsExist,StrengthenLevel,AttackCompose,DefendCompose,LuckCompose,AgilityCompose,IsBinds,BeginDate,ValidDate)
select UserID,0,case when sex=1 then  6101 else 6201 end,13,1,1,'',1,0,0,0,0,0,1,getdate(),0 from Sys_Users_Detail where IsFirst = 0

if @@error<>0
begin
  rollback tran
  select @@error
end

insert into Sys_Users_Goods(UserID,BagType,TemplateID,Place,[Count],IsJudge,Color,IsExist,StrengthenLevel,AttackCompose,DefendCompose,LuckCompose,AgilityCompose,IsBinds,BeginDate,ValidDate)
select UserID,0,case when sex=1 then  5101 else 5201 end,14,1,1,'',1,0,0,0,0,0,1,getdate(),0 from Sys_Users_Detail where IsFirst = 0

if @@error<>0
begin
  rollback tran
  select @@error
end

--道具
insert into Sys_Users_Goods(UserID,BagType,TemplateID,Place,[Count],IsJudge,Color,IsExist,StrengthenLevel,AttackCompose,DefendCompose,LuckCompose,AgilityCompose,IsBinds,BeginDate,ValidDate)
select UserID,1,10001,1,10,1,'',1,0,0,0,0,0,1,getdate(),0 from Sys_Users_Detail where IsFirst = 0

if @@error<>0
begin
  rollback tran
  select @@error
end

insert into Sys_Users_Goods(UserID,BagType,TemplateID,Place,[Count],IsJudge,Color,IsExist,StrengthenLevel,AttackCompose,DefendCompose,LuckCompose,AgilityCompose,IsBinds,BeginDate,ValidDate)
select UserID,1,10003,2,10,1,'',1,0,0,0,0,0,1,getdate(),0 from Sys_Users_Detail where IsFirst = 0

if @@error<>0
begin
  rollback tran
  select @@error
end


insert into Sys_Users_Goods(UserID,BagType,TemplateID,Place,[Count],IsJudge,Color,IsExist,StrengthenLevel,AttackCompose,DefendCompose,LuckCompose,AgilityCompose,IsBinds,BeginDate,ValidDate)
select UserID,1,10005,3,10,1,'',1,0,0,0,0,0,1,getdate(),0 from Sys_Users_Detail where IsFirst = 0

if @@error<>0
begin
  rollback tran
  select @@error
end


insert into Sys_Users_Goods(UserID,BagType,TemplateID,Place,[Count],IsJudge,Color,IsExist,StrengthenLevel,AttackCompose,DefendCompose,LuckCompose,AgilityCompose,IsBinds,BeginDate,ValidDate)
select UserID,1,10008,0,20,1,'',1,0,0,0,0,0,1,getdate(),0 from Sys_Users_Detail where IsFirst = 0

if @@error<>0
begin
  rollback tran
  select @@error
end


commit tran 
set xact_abort off

select '0'



GO
