-- SQL_STORED_PROCEDURE dbo.SP_MarryInfo_Single (modified 2021-06-04T05:18:35.607)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<交友信息：显示一条交友信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_MarryInfo_Single]   
 @ID int
AS  

   begin 
     select * from Marry_Info WHERE ID=@ID and IsExist = 1
   end








GO
