-- SQL_STORED_PROCEDURE dbo.Mem_UsersInRoles_Save (modified 2012-04-21T07:54:31.123)
CREATE PROCEDURE  Mem_UsersInRoles_Save
 @UserID Int, 
 @RoleID Int,  
 @op varchar(50), 
 @ouototal varchar(50)='' output AS  
 if( @op='Insert') 
   begin 
     INSERT INTO Mem_UsersInRoles(UserID, RoleID) 
     VALUES(@UserID, @RoleID)
     select @@identity as 'identity'
     set @ouototal=@@identity    
 end
GO
