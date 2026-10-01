-- SQL_STORED_PROCEDURE dbo.SP_ConsortiaApplyAlly_Delete (modified 2021-06-04T05:18:35.047)




-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：清除公会关系>
-- =============================================
CREATE Procedure [dbo].[SP_ConsortiaApplyAlly_Delete]   
 @ID int, 
 @UserID int, 
 @ConsortiaID int
AS

declare @tempRight int
select @tempRight=[Right] from V_Consortia_Users where ConsortiaID=@ConsortiaID and UserID=@UserID and IsExist=1

if @tempRight is null or (@tempRight&64)=0
begin
  return 2
end

Update Consortia_Apply_Ally set IsExist = 0 where [ID]=@ID and Consortia2ID=@ConsortiaID 

if @@error<>0
begin
  return @@error
end

return 0








GO
