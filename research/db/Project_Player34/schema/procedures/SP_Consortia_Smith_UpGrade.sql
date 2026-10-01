-- SQL_STORED_PROCEDURE dbo.SP_Consortia_Smith_UpGrade (modified 2021-06-04T05:18:34.983)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：公会铁匠铺升级>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Consortia_Smith_UpGrade]
 @ConsortiaID int, 
 @UserID int
AS

declare @Level int
declare @Riches int
declare @SmithLevel int
select @Level=[Level],@Riches=Riches,@SmithLevel=SmithLevel from Consortia where ConsortiaID=@ConsortiaID and ChairmanID=@UserID and IsExist=1

if @Level is null or @Level=0
begin
  return 2
end

if @Level<=@SmithLevel
begin
  return 3
end


set @SmithLevel=@SmithLevel+1

declare @SmithRiches int
select @SmithRiches=SmithRiches from Consortia_Level where [Level]=@SmithLevel 

if @SmithRiches is null or @SmithRiches=0
begin
  return 4
end

if @Riches<@SmithRiches
begin
  return 5
end

--set @Riches=@Riches+@Reward-@NeedRiches

Update Consortia set SmithLevel=SmithLevel+1,Riches=@Riches-@SmithRiches where ConsortiaID=@ConsortiaID and IsExist=1

if @@error<>0
begin
  return @@error
end

return 0










GO
