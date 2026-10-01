-- SQL_STORED_PROCEDURE dbo.SP_MarryInfo_Add (modified 2021-06-04T05:18:35.600)




-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<结婚信息：插入结婚信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_MarryInfo_Add]   
 @ID int output, 
 @UserID int, 
 @IsPublishEquip bit, 
 @Introduction nvarchar(120),
 @RegistTime datetime

AS  
     INSERT INTO Marry_Info( UserID,IsPublishEquip,Introduction,RegistTime) 
     VALUES( @UserID,@IsPublishEquip,@Introduction,@RegistTime)
     select @@identity as 'identity'
     set @ID=@@identity








GO
