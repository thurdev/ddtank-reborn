-- SQL_STORED_PROCEDURE dbo.SP_MarryInfo_Delete (modified 2021-06-04T05:18:35.603)




-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<结婚信息：删除一个用户的结婚信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_MarryInfo_Delete]
 @ID int,
 @UserID int

AS  

set xact_abort on 
begin tran

  update Marry_Info set IsExist=0 where ID=@ID and UserID=@UserID
 
  if @@error<>0 or @@ROWCOUNT =0
    begin
      rollback tran
      return 1 
   end
commit tran
set xact_abort off
return 0








GO
