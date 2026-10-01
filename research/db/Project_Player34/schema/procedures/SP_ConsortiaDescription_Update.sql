-- SQL_STORED_PROCEDURE dbo.SP_ConsortiaDescription_Update (modified 2021-06-04T05:18:35.103)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：公会公告信息更新>
-- =============================================
CREATE Procedure [dbo].[SP_ConsortiaDescription_Update]
 @ConsortiaID int, 
 @UserID int,
 @Description nvarchar(2000)
AS

declare @tempRight int
select @tempRight=[Right] from V_Consortia_Users where ConsortiaID=@ConsortiaID and UserID=@UserID and IsExist=1

if @tempRight is null or (@tempRight&16)=0
begin
  return 2
end

Update Consortia set [Description] = @Description where ConsortiaID=@ConsortiaID 

if @@error<>0
begin
  return @@error
end

return 0








GO
