-- SQL_STORED_PROCEDURE dbo.SP_Consortia_Single (modified 2021-06-04T05:18:34.970)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：读到一条有效公会信息>
-- =============================================
CREATE Procedure [dbo].[SP_Consortia_Single]   
 @ID int
AS  

   begin 
     select * from V_Consortia WHERE ConsortiaID=@ID and IsExist = 1
   end









GO
