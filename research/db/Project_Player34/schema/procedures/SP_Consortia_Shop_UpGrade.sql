-- SQL_STORED_PROCEDURE dbo.SP_Consortia_Shop_UpGrade (modified 2021-06-04T05:18:34.963)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：公会商城升级>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Consortia_Shop_UpGrade]
 @ConsortiaID int, 
 @UserID int
AS

declare @Level int
declare @Riches int
declare @ShopLevel int
select @Level=[Level],@Riches=Riches,@ShopLevel=ShopLevel from Consortia where ConsortiaID=@ConsortiaID and ChairmanID=@UserID and IsExist=1

if @Level is null or @Level=0
begin
  return 2
end

if @Level/2<=@ShopLevel
begin
  return 3
end


set @ShopLevel=@ShopLevel+1

declare @ShopRiches int
select @ShopRiches=ShopRiches from Consortia_Level where [Level]=@ShopLevel 

if @ShopRiches is null or @ShopRiches=0
begin
  return 4
end

if @Riches<@ShopRiches
begin
  return 5
end

--set @Riches=@Riches+@Reward-@NeedRiches

Update Consortia set ShopLevel=ShopLevel+1,Riches=@Riches-@ShopRiches where ConsortiaID=@ConsortiaID and IsExist=1

if @@error<>0
begin
  return @@error
end

return 0








GO
