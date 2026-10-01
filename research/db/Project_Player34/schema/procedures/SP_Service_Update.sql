-- SQL_STORED_PROCEDURE dbo.SP_Service_Update (modified 2021-06-04T05:18:35.690)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<服务器信息：更新一条服务器信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Service_Update]   
 @ID int, 
 @State int, 
 @Online int
 AS  
   begin 
     UPDATE Server_List Set State=@State, Online=@Online WHERE ID=@ID
   end








GO
