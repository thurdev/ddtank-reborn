-- SQL_STORED_PROCEDURE dbo.SP_Consortia_Fight (modified 2021-06-04T05:18:34.927)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：公会战后的财富计算>
-- =============================================
CREATE  Procedure [dbo].[SP_Consortia_Fight]
@ConsortiaWin int,
@ConsortiaLose int,
@PlayerCount int,
@Riches int output,
@State int,
@TotalKillHealth int,
@RichesRate numeric(6,2)
as

if @PlayerCount<1
begin
	return 6
end

declare @WinLevel int
declare @LoseLevel int
declare @WinRiches int
declare @LoseRiches int

select @WinLevel=[Level],@WinRiches=Riches from Consortia where ConsortiaID=@ConsortiaWin and IsExist=1

if @WinLevel is null
begin
	return 7
end

if @WinLevel<3
begin
	return 1
end

select @LoseLevel=[Level],@LoseRiches=Riches from Consortia where ConsortiaID=@ConsortiaLose and IsExist=1

if @LoseLevel is null
begin
	return 8
end

if @LoseLevel<3
begin
	return 2
end

--if @LoseRiches<1
--begin
--	return 3
--end

declare @modulus int 
if @State=2
begin
	set @modulus=2
end
else
begin
	set @modulus=1
end

--中立公会=（20+（对方公会等级-3）*4）*对方参战人数
--敌对公会=（40+（对方公会等级-3）*8）*对方参战人数

--set @Riches = (@LoseLevel -2)*20*@modulus*@PlayerCount
--set @Riches = 10*@modulus*@PlayerCount
--set @Riches = (20+(@LoseLevel-3)*4) *@PlayerCount*@modulus

--if @LoseRiches<@Riches
--begin
--	set @Riches = @LoseRiches
--end

--中立公会=|（对方参战人数+|队伍总伤害/2000|）/2|
--敌对公会=对方参战人数+|队伍总伤害/2000|
set @Riches = (@PlayerCount + @TotalKillHealth/2000)*@modulus/2*@RichesRate


set xact_abort on
begin tran

update  Consortia set Riches=Riches+@Riches,WarnDate=getdate()  where ConsortiaID=@ConsortiaWin 

if @@Error <> 0 
begin 
 rollback tran
 return 4
end

--update  Consortia set Riches=Riches-@Riches,WarnDate=getdate()  where ConsortiaID=@ConsortiaLose

--if @@Error <> 0 
--begin 
-- rollback tran
-- return 5
--end

commit tran
set xact_abort off

select @Riches
return 0







GO
