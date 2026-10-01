-- SQL_STORED_PROCEDURE dbo.SP_ConsortiaPlacard_Update (modified 2021-06-04T05:18:35.173)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：更新公会宣言>
-- =============================================
CREATE Procedure [dbo].[SP_ConsortiaPlacard_Update]
 @ConsortiaID int, 
 @UserID int,
 @Placard nvarchar(2000)
AS

declare @tempRight int
select @tempRight=[Right] from V_Consortia_Users where ConsortiaID=@ConsortiaID and UserID=@UserID and IsExist=1

if @tempRight is null or (@tempRight&8)=0
begin
  return 2
end

Update Consortia set [Placard] = @Placard where ConsortiaID=@ConsortiaID 

if @@error<>0
begin
  return @@error
end

return 0








GO
