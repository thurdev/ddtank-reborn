-- SQL_STORED_PROCEDURE dbo.SP_ConsortiaUserRemark_Update (modified 2021-06-04T05:18:35.210)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：添加公会中的用户备注信息>
-- =============================================
CREATE Procedure [dbo].[SP_ConsortiaUserRemark_Update]
 @ID int,
 @ConsortiaID int, 
 @UserID int,
 @Remark nvarchar(2000)
AS

declare @tempRight int
select @tempRight=[Right] from V_Consortia_Users where ConsortiaID=@ConsortiaID and UserID=@UserID and IsExist=1

if @tempRight is null or (@tempRight&0)=0
begin
  return 2
end

Update Consortia_Users set Remark = @Remark where ConsortiaID=@ConsortiaID and [ID]= @ID  and IsExist=1

if @@error<>0
begin
  return @@error
end

return 0








GO
