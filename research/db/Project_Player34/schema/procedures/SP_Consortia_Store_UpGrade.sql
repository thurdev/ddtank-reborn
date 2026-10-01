-- SQL_STORED_PROCEDURE dbo.SP_Consortia_Store_UpGrade (modified 2021-06-04T05:18:34.990)




-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：公会保管箱升级>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Consortia_Store_UpGrade]
 @ConsortiaID int, 
 @UserID int
AS

declare @Level int
declare @Riches int
declare @StoreLevel int
select @Level=[Level],@Riches=Riches,@StoreLevel=StoreLevel from Consortia where ConsortiaID=@ConsortiaID and ChairmanID=@UserID and IsExist=1

if @Level is null or @Level=0
begin
  return 2
end

if @Level<=@StoreLevel
begin
  return 3
end


set @StoreLevel=@StoreLevel+1

declare @StoreRiches int
select @StoreRiches=StoreRiches from Consortia_Level where [Level]=@StoreLevel 

if @StoreRiches is null or @StoreRiches=0
begin
  return 4
end

if @Riches<@StoreRiches
begin
  return 5
end

--set @Riches=@Riches+@Reward-@NeedRiches

Update Consortia set StoreLevel=StoreLevel+1,Riches=@Riches-@StoreRiches where ConsortiaID=@ConsortiaID and IsExist=1

if @@error<>0
begin
  return @@error
end

return 0









GO
