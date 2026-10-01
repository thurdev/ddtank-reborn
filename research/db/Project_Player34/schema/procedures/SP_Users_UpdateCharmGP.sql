-- SQL_STORED_PROCEDURE dbo.SP_Users_UpdateCharmGP (modified 2021-06-04T05:18:36.550)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<邮件信息：用户查阅邮件后，取出相关的附件>
-- =============================================
create  PROCEDURE [dbo].[SP_Users_UpdateCharmGP]   
 @UserID int, 
 @CharmGP int
AS  

set xact_abort on 
begin tran

	update Sys_Users_Detail set charmGP = charmGP + @CharmGP where UserID = @UserID

commit tran
set xact_abort off

  if @@error <>0
  begin 
    rollback tran
    return @@error
  end

return 0


GO
