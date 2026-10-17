-- SQL_STORED_PROCEDURE dbo.SP_ConsortiaRiches_Update (modified 2015-01-25T14:04:48.757)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：公会公告信息更新>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_ConsortiaRiches_Update]
 @ConsortiaID int, 
 @UserID int,
 @Riches int
AS

declare @tempRight int
select @tempRight=[Right] from V_Consortia_Users where ConsortiaID=@ConsortiaID and UserID=@UserID and IsExist=1

if @tempRight is null or (@tempRight&16)=0
begin
  return 2
end

Update Consortia set [Riches] = [Riches] - @Riches where ConsortiaID=@ConsortiaID 

if @@error<>0
begin
  return @@error
end

return 0

GO
