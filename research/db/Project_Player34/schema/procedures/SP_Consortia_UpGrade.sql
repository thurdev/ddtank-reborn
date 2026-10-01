-- SQL_STORED_PROCEDURE dbo.SP_Consortia_UpGrade (modified 2021-06-04T05:18:35.013)




-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：公会升级>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Consortia_UpGrade]
 @ConsortiaID int, 
 @UserID int
AS

declare @Level int
declare @Riches int
select @Level=[Level],@Riches=Riches from Consortia where ConsortiaID=@ConsortiaID and ChairmanID=@UserID and IsExist=1

if @Level is null or @Level=0
begin
  return 2
end

set @Level=@Level+1

declare @NeedRiches int
declare @Count int
declare @Reward int
select @NeedRiches=Riches,@Count=[Count],@Reward=Reward from Consortia_Level where [Level]=@Level 

if @Count is null or @Count=0
begin
  return 3
end

if @Riches<@NeedRiches
begin
  return 4
end

set @Riches=@Riches+@Reward-@NeedRiches

Update Consortia set [Level]=@Level,MaxCount=@Count,Riches=@Riches where ConsortiaID=@ConsortiaID and IsExist=1

if @@error<>0
begin
  return @@error
end

return 0








GO
