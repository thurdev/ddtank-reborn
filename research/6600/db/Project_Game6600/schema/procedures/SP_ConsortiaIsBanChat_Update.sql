-- SQL_STORED_PROCEDURE dbo.SP_ConsortiaIsBanChat_Update (modified 2015-01-25T14:04:48.760)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：公会对用户禁言>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_ConsortiaIsBanChat_Update]
 @ID int,
 @ConsortiaID int, 
 @UserID int,
 @IsBanChat int,
 @tempID int output,
 @tempName nvarchar(100) output
AS

declare @tempRight int
select @tempRight=[Right] from V_Consortia_Users where ConsortiaID=@ConsortiaID and UserID=@UserID and IsExist=1

if @tempRight is null or (@tempRight&4)=0
begin
  return 2
end


select @tempID=UserID,@tempName=UserName from Consortia_Users where ConsortiaID=@ConsortiaID and [UserID]= @ID  and IsExist=1

if @tempID is null or @tempID=0
begin
  return 2
end


Update Consortia_Users set IsBanChat = @IsBanChat where ConsortiaID=@ConsortiaID and [UserID]= @ID  and IsExist=1

if @@error<>0
begin
  return @@error
end

return 0

GO
