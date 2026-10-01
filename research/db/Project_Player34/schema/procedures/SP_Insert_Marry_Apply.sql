-- SQL_STORED_PROCEDURE dbo.SP_Insert_Marry_Apply (modified 2021-06-04T05:18:35.470)




-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：加入一条用户申请结婚信息>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Insert_Marry_Apply] 
@UserID int,
@ApplyUserID int,
@ApplyUserName nvarchar(50),
@ApplyType int,
@ApplyResult bit,
@LoveProclamation nvarchar(300)

AS

insert into Marry_Apply(UserID,ApplyUserID,ApplyUserName,ApplyType,ApplyResult,LoveProclamation) values(@UserID,@ApplyUserID,@ApplyUserName,@ApplyType,@ApplyResult,@LoveProclamation)
if(@@error <> 0)
begin
  return 1
end

return 0








GO
