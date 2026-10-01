-- SQL_STORED_PROCEDURE dbo.SP_ConsortiaApplyUser_Delete (modified 2021-06-04T05:18:35.070)



-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：删除用户申请信息>
-- =============================================
CREATE Procedure [dbo].[SP_ConsortiaApplyUser_Delete]   
 @ID int, 
 @UserID int, 
 @ConsortiaID int
AS

if @ConsortiaID<>0
begin

declare @tempRight int
select @tempRight=[Right] from V_Consortia_Users where ConsortiaID=@ConsortiaID and UserID=@UserID and IsExist=1

if @tempRight is null or (@tempRight&1)=0
begin
  return 2
end

Update Consortia_Apply_Users set IsExist = 0 where [ID]=@ID and ConsortiaID=@ConsortiaID 

if @@error<>0
begin
  return @@error
end

end
else
begin

declare @tempID int
select @tempID=UserID from Consortia_Apply_Users where  [ID]=@ID and IsExist=1

if @tempID is null or @tempID<>@UserID
begin
  return 3
end

Update Consortia_Apply_Users set IsExist = 0 where [ID]=@ID 

if @@error<>0
begin
  return @@error
end

end

return 0








GO
