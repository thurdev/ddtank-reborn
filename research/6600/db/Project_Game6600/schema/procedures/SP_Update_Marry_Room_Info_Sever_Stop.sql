-- SQL_STORED_PROCEDURE dbo.SP_Update_Marry_Room_Info_Sever_Stop (modified 2015-01-25T14:04:48.230)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<结婚信息：更新结婚房间>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Update_Marry_Room_Info_Sever_Stop]  
AS

update Marry_Room_Info set BreakTime=getdate() where IsExist = 1
if @@error<>0
begin
  return @@error
end

return 0

GO
