-- SQL_STORED_PROCEDURE dbo.SP_Consortia_UpdateTimeOpenTask (modified 2021-06-04T05:18:35.003)




-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：捐献公会财富>
-- =============================================
CREATE Procedure [dbo].[SP_Consortia_UpdateTimeOpenTask]
@ConsortiaID int,
@DateOpenTask datetime
as

update Consortia set DateOpenTask=@DateOpenTask where ConsortiaID=@ConsortiaID

if @@error <> 0
begin
  rollback tran
  return 1
end

return 0




GO
