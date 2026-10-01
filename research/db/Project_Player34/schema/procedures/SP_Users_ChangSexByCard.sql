-- SQL_STORED_PROCEDURE dbo.SP_Users_ChangSexByCard (modified 2021-06-04T05:18:36.063)
-- =============================================
-- Author:		<Xaivo>
-- ALTER  date: <2010-02-04>
-- Description:	<合服信息：修改用户昵称由改名卡影响>
-- =============================================
CREATE Procedure [dbo].[SP_Users_ChangSexByCard]
@UserId int,
@Sex bit

as
set xact_abort on
begin tran

UPDATE Sys_Users_Detail Set  Sex = @Sex WHERE UserId=@UserId 

if @@error <> 0
begin
  rollback tran
  return @@error
end

commit tran
set xact_abort off

return 0



GO
