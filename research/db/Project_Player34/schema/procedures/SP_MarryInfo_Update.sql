-- SQL_STORED_PROCEDURE dbo.SP_MarryInfo_Update (modified 2021-06-04T05:18:35.610)



-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<交友信息：更新一条交友信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_MarryInfo_Update] 
 @ID int, 
 @UserID int, 
 @IsPublishEquip bit, 
 @Introduction nvarchar(120),
 @RegistTime datetime

AS  

set xact_abort on 
begin tran

  update Marry_Info set IsPublishEquip=@IsPublishEquip,Introduction=@Introduction,RegistTime=@RegistTime  where ID=@ID and IsExist=1
 
  if @@error<>0 or @@ROWCOUNT =0
    begin
      rollback tran
      return 1
   end

commit tran
set xact_abort off
return 0








GO
