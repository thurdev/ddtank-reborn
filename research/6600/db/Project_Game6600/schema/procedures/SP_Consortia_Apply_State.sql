-- SQL_STORED_PROCEDURE dbo.SP_Consortia_Apply_State (modified 2015-01-25T14:04:48.507)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：是否开放公会申请>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Consortia_Apply_State]
 @ConsortiaID int, 
 @UserID int,
 @State bit
AS

update Consortia set OpenApply=@State where ConsortiaID=@ConsortiaID and ChairmanID=@UserID and IsExist=1

if @@ROWCOUNT=0
begin
  return 2
end

return 0

GO
